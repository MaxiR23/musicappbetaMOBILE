import Constants from "expo-constants";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import TrackPlayer, { Event, RepeatMode, TrackType } from "react-native-track-player";
import { ensureTrackPlayer } from "../components/player/setupTrackPlayer";
import { useMusicApi } from "../hooks/use-music-api";
import { MusicContext } from "./../context/MusicContext";
import { Song } from "./../types/music";

export function MusicProvider({ children }: { children: ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [queue, setQueue] = useState<Song[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(-1);
  const [playSource, setPlaySource] = useState<PlaySource | null>(null);

  const { logPlayAlbum, logPlayArtist } = useMusicApi();

  const syncingRef = useRef(false);
  const switchingRef = useRef(false);
  const lastLoggedContextKeyRef = useRef<string | null>(null);

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

  // Prefetch por lote (calienta en el backend sin clavar el primer play)
  function warmBatch(ids: string[], baseUrl: string) {
    if (!ids?.length) return;
    fetch(`${baseUrl}/music/prefetch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    }).catch(() => {});
  }

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

    // 🔒 Siempre vía PROXY (redir=2). NO usar redir=0 ni 1.
    const tracks = list.map((s, i) => ({
      id: String(s.id),
      url: `${BASE_URL}/music/play?id=${encodeURIComponent(s.id)}&redir=2`,
      title: (s as any).title,
      artist: (s as any).artistName ?? (s as any).artist ?? "",
      artwork: (s as any).thumbnail ?? (s as any).thumbnail_url ?? undefined,
      type: TrackType.Default,
      __idx: i,
    })) as any[];

    const idx = Math.max(0, Math.min(startIndex, tracks.length - 1));
    const doSkip = (TrackPlayer as any).skip?.bind(TrackPlayer);

    // Prefetch en lote (IDs alrededor del inicio)
    try {
      const ids = list.map((s: any) => String(s.id)).filter(Boolean);
      const uniq = Array.from(new Set(ids));
      const slice = uniq.slice(Math.max(0, idx - 2), idx + 12);
      warmBatch(slice, BASE_URL);
    } catch {}

    const getQueue = (TrackPlayer as any).getQueue?.bind(TrackPlayer);
    const getActiveTrack = (TrackPlayer as any).getActiveTrack?.bind(TrackPlayer);
    const getCurrentTrack = (TrackPlayer as any).getCurrentTrack?.bind(TrackPlayer);
    const getTrack = (TrackPlayer as any).getTrack?.bind(TrackPlayer);
    const dumpQueue = async (label: string) => {
      try {
        const q = getQueue ? await getQueue() : null;
        console.log(`[sync] ${label} queue.len:`, q?.length, q?.map((t: any, i: number) => ({ i, id: t?.id })));
        let active: any = getActiveTrack ? await getActiveTrack() : null;
        if (!active && getCurrentTrack && getTrack) {
          const ci = await getCurrentTrack();
          if (typeof ci === "number" && ci >= 0) active = await getTrack(ci);
        }
        console.log(`[sync] ${label} activeTrack:`, active ? { id: active.id, url: active.url } : null);
      } catch (e) {
        console.warn(`[sync] ${label} dumpQueue ERROR:`, e);
      }
    };

    syncingRef.current = true;
    try {
      await TrackPlayer.reset();
      await TrackPlayer.add(tracks);

      if (doSkip) {
        await doSkip(idx);
      } else {
        for (let i = 0; i < idx; i++) await TrackPlayer.skipToNext();
      }

      await dumpQueue("post-add");

      await new Promise((r) => setTimeout(r, 50));
      await TrackPlayer.play();
    } catch (e) {
      console.error("[sync] ERROR reset/add/skip/play:", e);
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

    // Log de contexto (una sola vez por cambio)
    try {
      const ctx = resolveContextKey(list, source);
      if (ctx) {
        if (lastLoggedContextKeyRef.current !== ctx.key) {
          lastLoggedContextKeyRef.current = ctx.key;
          const srcMeta = { name: source?.name ?? null, thumb: source?.thumb ?? null };
          if (ctx.kind === "album") {
            await logPlayAlbum(ctx.id, srcMeta).catch(() => {});
            console.log("[tracklog] album logged:", ctx.id, srcMeta);
          } else if (ctx.kind === "artist") {
            await logPlayArtist(ctx.id, srcMeta).catch(() => {});
            console.log("[tracklog] artist logged:", ctx.id, srcMeta);
          }
        } else {
          console.log("[tracklog] same context, skip log:", ctx.key);
        }
      }
    } catch (e) {
      console.warn("[tracklog] logging failed:", e);
    }

    try {
      await syncWithTrackPlayer(list, startIndex);
      setTimeout(() => { TrackPlayer.play().catch(() => {}); }, 350);
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

    const doSkip = (TrackPlayer as any).skip?.bind(TrackPlayer);
    (async () => {
      try {
        if (doSkip) await doSkip(ni);
        else await TrackPlayer.skipToNext();
        await TrackPlayer.play();
      } catch (e) {
        console.error("[next] ERROR:", e);
      }
    })();
  }

  function prev() {
    if (queueIndex <= 0) return;
    const ni = queueIndex - 1;

    setQueueIndex(ni);
    setCurrentSong(queue[ni]);

    const doSkip = (TrackPlayer as any).skip?.bind(TrackPlayer);
    (async () => {
      try {
        if (doSkip) await doSkip(ni);
        else await TrackPlayer.skipToPrevious();
        await TrackPlayer.play();
      } catch (e) {
        console.error("[prev] ERROR:", e);
      }
    })();
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
      if (queue.length) {
        setQueueIndex(queue.length - 1);
        setCurrentSong(queue[queue.length - 1] ?? null);
      }
      try {
        const mode = (await (TrackPlayer as any).getRepeatMode?.()) ?? RepeatMode.Off;
        if (mode !== RepeatMode.Track && mode !== RepeatMode.Queue) {
          await TrackPlayer.pause();
          await TrackPlayer.seekTo(0);
        }
      } catch (e) {
        console.warn("[ended] reset to 0 failed:", e);
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