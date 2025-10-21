import { useAuth } from "@/src/hooks/use-auth";
import Constants from "expo-constants";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import TrackPlayer, { Event, RepeatMode, TrackType } from "react-native-track-player";
import { useCacheInvalidation } from "../hooks/use-cache-invalidation";
import { useMusicApi } from "../hooks/use-music-api";
import { ensureTrackPlayer } from "../services/setupTrackPlayer";
import { MusicContext } from "./../context/MusicContext";
import { Song } from "./../types/music";

export function MusicProvider({ children }: { children: ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [queue, setQueue] = useState<Song[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(-1);
  const [playSource, setPlaySource] = useState<PlaySource | null>(null);

  const { user } = useAuth();
  const userId = user?.id ?? undefined;

  const { logPlayAlbum, logPlayArtist } = useMusicApi();
  const { invalidateRecent } = useCacheInvalidation(userId);

  const syncingRef = useRef(false);
  const switchingRef = useRef(false);
  const lastLoggedContextKeyRef = useRef<string | null>(null);
  const endingRef = useRef(false);

  type PlaySource =
    | { type: "playlist"; name?: string | null; thumb?: string | null }
    | { type: "album"; name?: string | null; thumb?: string | null }
    | { type: "artist"; name?: string | null; thumb?: string | null }
    | { type: "queue"; name?: string | null; thumb?: string | null };

  function getBaseUrl() {
    return (
      (process.env.EXPO_PUBLIC_API_URL as string | undefined) ??
      ((Constants?.expoConfig as any)?.extra?.EXPO_PUBLIC_API_URL as string | undefined) ??
      null
    );
  }

  function warmBatch(ids: string[], baseUrl: string) { return; }

  function majorityId<T>(list: T[], pick: (x: T) => string | null | undefined): string | null {
    const counts = new Map<string, number>();
    for (const item of list) {
      const v = pick(item);
      if (!v) continue;
      counts.set(v, (counts.get(v) || 0) + 1);
    }
    let best: string | null = null;
    let bestN = 0;
    for (const [k, n] of counts) if (n > bestN) { best = k; bestN = n; }
    return best;
  }

  function resolveContextKey(
    list: Song[],
    source?: PlaySource | null
  ): { key: string; kind: "album" | "artist"; id: string } | null {
    if (!source) return null;
    if (source.type === "album") {
      const albumId =
        majorityId(list, (s: any) => s.albumId ?? s.album_id ?? null) || null;
      return albumId ? { key: `album:${albumId}`, kind: "album", id: albumId } : null;
    }
    if (source.type === "artist") {
      const artistId =
        majorityId(list, (s: any) => s.artistId ?? s.artist_id ?? null) || null;
      return artistId ? { key: `artist:${artistId}`, kind: "artist", id: artistId } : null;
    }
    return null;
  }

  async function syncWithTrackPlayer(list: Song[], startIndex: number) {
    await ensureTrackPlayer();

    const BASE_URL = getBaseUrl();
    if (!BASE_URL || !list?.length) {
      console.warn("[sync] BASE_URL o lista inválidos");
      return;
    }

    const tracks = list.map((s, i) => ({
      id: String(s.id),
      url: `${BASE_URL}/music/play?id=${encodeURIComponent(s.id)}&redir=2`,
      title: (s as any).title,
      artist: (s as any).artistName ?? (s as any).artist ?? "",
      artwork: (s as any).thumbnail ?? (s as any).thumbnail_url ?? undefined,
      type: TrackType.Default,
      headers: {
        Range: "bytes=0-",
        "Accept-Encoding": "identity",
        Connection: "keep-alive",
      },
      __idx: i,
    })) as any[];

    const idx = Math.max(0, Math.min(startIndex, tracks.length - 1));

    syncingRef.current = true;
    try {
      await TrackPlayer.reset();
      await TrackPlayer.setRepeatMode(RepeatMode.Off);
      await TrackPlayer.add(tracks);
      await TrackPlayer.skip(idx);
      TrackPlayer.play().catch(() => { });

      try {
        const ids = list.map((s: any) => String(s.id)).filter(Boolean);
        const uniq = Array.from(new Set(ids));
        const slice = uniq.slice(Math.max(0, idx - 3), idx + 16);
        warmBatch(slice, BASE_URL);
      } catch { }
    } catch (e) {
      console.error("[sync] ERROR reset/add/play:", e);
      throw e;
    } finally {
      syncingRef.current = false;
    }
  }

  async function playFromList(list: Song[], startIndex: number, source?: PlaySource) {
    if (switchingRef.current) return;
    switchingRef.current = true;

    setQueue(list);
    setQueueIndex(startIndex);
    setCurrentSong(list[startIndex] ?? null);
    setPlaySource(source ?? { type: "queue", name: null, thumb: null });

    try {
      const ctx = resolveContextKey(list, source);
      if (ctx) {
        if (lastLoggedContextKeyRef.current !== ctx.key) {
          lastLoggedContextKeyRef.current = ctx.key;
          const srcMeta = { name: source?.name ?? null, thumb: source?.thumb ?? null };
          if (ctx.kind === "album") {
            await logPlayAlbum(ctx.id, srcMeta).catch(() => { });
            console.log("[tracklog] album logged:", ctx.id, srcMeta);
          } else if (ctx.kind === "artist") {
            await logPlayArtist(ctx.id, srcMeta).catch(() => { });
            console.log("[tracklog] artist logged:", ctx.id, srcMeta);
          }

          setTimeout(async () => {
            try {
              await invalidateRecent();
            } catch (e) {
              console.warn("[cache] ❌ Error invalidando:", e);
            }
          }, 2000);

        } else {
          console.log("[tracklog] same context, skip log:", ctx.key);
        }
      }
    } catch (e) {
      console.warn("[tracklog] logging failed:", e);
    }

    try {
      await syncWithTrackPlayer(list, startIndex);
    } catch (err) {
      console.error("[RNTP] error en syncWithTrackPlayer]:", err);
    } finally {
      switchingRef.current = false;
    }
  }

  function next() {
    if (queueIndex < 0) return;
    const ni = queueIndex + 1;
    if (ni >= queue.length) return;

    setQueueIndex(ni);
    setCurrentSong(queue[ni]);

    (async () => {
      try {
        await TrackPlayer.skipToNext();
        await TrackPlayer.play();
      } catch (e) {
        console.error("[next] ERROR:", e);
      }
    })();
  }

  async function prev() {
    if (queueIndex < 0) return;

    try {
      // Obtener la posición actual de reproducción
      const position = await TrackPlayer.getPosition();

      // Si lleva más de 3 segundos, reiniciar la canción
      if (position > 3) {
        await TrackPlayer.seekTo(0);
        await TrackPlayer.play();
        return;
      }
    } catch (e) {
      console.error("[prev] ERROR obteniendo posición:", e);
    }

    // Si lleva menos de 3 segundos O si hubo error, ir a la canción anterior
    const ni = queueIndex - 1;

    if (ni < 0) {
      // Ya estamos en la primera canción, solo reiniciar
      try {
        await TrackPlayer.seekTo(0);
        await TrackPlayer.play();
      } catch (e) {
        console.error("[prev] ERROR (seekTo 0):", e);
      }
      return;
    }

    setQueueIndex(ni);
    setCurrentSong(queue[ni]);

    try {
      await TrackPlayer.skipToPrevious();
      await TrackPlayer.play();
    } catch (e) {
      console.error("[prev] ERROR (skipToPrevious):", e);
    }
  }

  useEffect(() => {
    const findActiveIndex = async (): Promise<number | null> => {
      try {
        const getActiveTrack = (TrackPlayer as any).getActiveTrack?.bind(TrackPlayer);
        const getCurrentTrack = (TrackPlayer as any).getCurrentTrack?.bind(TrackPlayer);
        const getTrack = (TrackPlayer as any).getTrack?.bind(TrackPlayer);

        let active: any = getActiveTrack ? await getActiveTrack() : null;
        if (!active && getCurrentTrack) {
          const idx = await getCurrentTrack();
          if (typeof idx === "number" && idx >= 0 && getTrack) {
            active = await getTrack(idx);
          }
        }
        const activeId = active?.id ?? null;
        if (!activeId) return null;
        const pos = queue.findIndex((s) => String(s.id) === String(activeId));
        return pos >= 0 ? pos : null;
      } catch {
        return null;
      }
    };

    const onActiveChanged = async () => {
      if (syncingRef.current) return;
      const pos = await findActiveIndex();
      if (pos == null) return;

      setQueueIndex((prev) => (prev !== pos ? pos : prev));
      setCurrentSong((prev) => (queue[pos] && prev?.id !== queue[pos].id ? queue[pos] : prev));

      try {
        const BASE_URL = getBaseUrl();
        const nexts = queue.slice(pos + 1, pos + 6).map((s) => String(s.id));
        if (BASE_URL && nexts.length) {
          warmBatch(nexts, BASE_URL);
          console.log("[prefetch] warm next batch:", nexts);
        }
      } catch (e) {
        console.warn("[prefetch] warm next failed:", e);
      }
    };

    const subActive = TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, onActiveChanged);

    const subEnded = TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
      if (syncingRef.current) return;
      if (endingRef.current) return;
      endingRef.current = true;

      try {
        const lastIdx = Math.max(0, queue.length - 1);
        const lastSong = queue[lastIdx];
        if (!lastSong) { endingRef.current = false; return; }

        await TrackPlayer.setRepeatMode(RepeatMode.Off).catch(() => { });
        await TrackPlayer.skip(lastIdx).catch(() => { });
        await TrackPlayer.pause().catch(() => { });
        await TrackPlayer.seekTo(0).catch(() => { });

        setQueueIndex(lastIdx);
        setCurrentSong(lastSong);
      } catch (e) {
        console.warn("[ended] finalize at last track failed:", e);
      } finally {
        endingRef.current = false;
      }
    });

    const subLegacy = TrackPlayer.addEventListener(Event.PlaybackTrackChanged as any, onActiveChanged);

    return () => {
      subActive.remove();
      subEnded.remove();
      subLegacy.remove();
    };
  }, [queue]);

  const value = useMemo(
    () => ({
      currentSong,
      setCurrentSong,
      queue,
      queueIndex,
      playFromList,
      next,
      prev,
      playSource,
    }),
    [currentSong, queue, queueIndex, playSource]
  );

  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
}