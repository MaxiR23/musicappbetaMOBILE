import Constants from "expo-constants";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import TrackPlayer, { Event, RepeatMode, TrackType } from "react-native-track-player";
import { ensureTrackPlayer } from "../components/player/setupTrackPlayer";
import { MusicContext } from "./../context/MusicContext";
import { Song } from "./../types/music";
// ⬅️ NUEVO
import { useMusicApi } from "../hooks/use-music-api";

export function MusicProvider({ children }: { children: ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [queue, setQueue] = useState<Song[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(-1);
  const [playSource, setPlaySource] = useState<PlaySource | null>(null);

  // ⬅️ NUEVO: endpoints de tracking
  const { logPlayAlbum, logPlayArtist } = useMusicApi();

  // 👇 Flag para evitar que eventos externos pisen el índice mientras sincronizamos
  const syncingRef = useRef(false);
  // 👇 Evita solapar cambios de cola
  const switchingRef = useRef(false);

  // ⬅️ NUEVO: recordamos el último contexto logueado para no repetir
  const lastLoggedContextKeyRef = useRef<string | null>(null);

  type PlaySource =
    | { type: "playlist"; name?: string | null }
    | { type: "album"; name?: string | null }
    | { type: "artist"; name?: string | null }
    | { type: "queue"; name?: string | null };

  function getBaseUrl() {
    return (
      (process.env.EXPO_PUBLIC_API_URL as string | undefined) ??
      ((Constants?.expoConfig as any)?.extra?.EXPO_PUBLIC_API_URL as string | undefined) ??
      null
    );
  }

  // 🔁 Calienta el backend SIN bloquear
  function warmResolve(id: string, baseUrl: string) {
    const url = `${baseUrl}/music/play?id=${encodeURIComponent(id)}&redir=0`;
    fetch(url).catch(() => {});
  }

  // ⬅️ NUEVO: saca el id más común (majority) de una propiedad en la lista
  function majorityId<T>(list: T[], pick: (x: T) => string | null | undefined): string | null {
    const counts = new Map<string, number>();
    for (const item of list) {
      const v = pick(item);
      if (!v) continue;
      counts.set(v, (counts.get(v) || 0) + 1);
    }
    let best: string | null = null;
    let bestN = 0;
    for (const [k, n] of counts) {
      if (n > bestN) { best = k; bestN = n; }
    }
    return best;
  }

  // ⬅️ NUEVO: resuelve contexto (album/artist) a partir de la cola
  function resolveContextKey(list: Song[], source?: PlaySource | null): { key: string, kind: "album" | "artist", id: string } | null {
    if (!source) return null;
    if (source.type === "album") {
      const albumId =
        majorityId(list, (s: any) => s.albumId ?? s.album_id ?? null) ||
        null;
      if (albumId) return { key: `album:${albumId}`, kind: "album", id: albumId };
      return null;
    }
    if (source.type === "artist") {
      const artistId =
        majorityId(list, (s: any) => s.artistId ?? s.artist_id ?? null) ||
        null;
      if (artistId) return { key: `artist:${artistId}`, kind: "artist", id: artistId };
      return null;
    }
    return null;
  }

  // ✅ Carga determinista: agrega TODA la cola, salta al índice y reproduce.
  async function syncWithTrackPlayer(list: Song[], startIndex: number) {
    console.log("[sync] IN → startIndex:", startIndex, "list.len:", list?.length);

    await ensureTrackPlayer();

    const BASE_URL = getBaseUrl();
    if (!BASE_URL || !list?.length) {
      console.warn("[sync] BASE_URL o lista inválidos");
      return;
    }

    // Usamos proxy (redir=2) para todas; NO seteamos contentType para evitar mismatch.
    const tracks = list.map((s, i) => ({
      id: String(s.id),
      url: `${BASE_URL}/music/play?id=${encodeURIComponent(s.id)}&redir=2`,
      title: (s as any).title,
      artist: (s as any).artistName ?? (s as any).artist ?? "",
      artwork: (s as any).thumbnail ?? (s as any).thumbnail_url ?? undefined,
      type: TrackType.Default,
      __idx: i, // debug
    })) as any[];

    const idx = Math.max(0, Math.min(startIndex, tracks.length - 1));
    const doSkip = (TrackPlayer as any).skip?.bind(TrackPlayer);

    // (opcional) calentar actual
    try { warmResolve((list[idx] as any).id, BASE_URL); } catch {}

    // Debug helpers
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
      console.log("[sync] added all. total:", tracks.length);

      if (doSkip) {
        await doSkip(idx);
        console.log("[sync] skip →", idx);
      } else {
        for (let i = 0; i < idx; i++) await TrackPlayer.skipToNext();
        console.log("[sync] skipToNext x", idx);
      }

      await dumpQueue("post-add");
      await TrackPlayer.play();
      console.log("[sync] play() dispatched");
    } catch (e) {
      console.error("[sync] ERROR reset/add/skip/play:", e);
      throw e;
    } finally {
      syncingRef.current = false;
    }
  }

  // ⬇️ Pausa inmediata + evita dobles clics
  async function playFromList(list: Song[], startIndex: number, source?: PlaySource) {
    if (switchingRef.current) return;
    switchingRef.current = true;

    await TrackPlayer.pause().catch(() => {});

    setQueue(list);
    setQueueIndex(startIndex);
    setCurrentSong(list[startIndex] ?? null);
    setPlaySource(source ?? { type: "queue", name: null });

    // ⬅️ NUEVO: log de contexto (1 sola vez por cambio de fuente)
    try {
      const ctx = resolveContextKey(list, source);
      if (ctx) {
        if (lastLoggedContextKeyRef.current !== ctx.key) {
          lastLoggedContextKeyRef.current = ctx.key;
          if (ctx.kind === "album") {
            // no importa la respuesta; si falla no rompe reproducción
            await logPlayAlbum(ctx.id).catch(() => {});
            console.log("[tracklog] album logged:", ctx.id);
          } else if (ctx.kind === "artist") {
            await logPlayArtist(ctx.id).catch(() => {});
            console.log("[tracklog] artist logged:", ctx.id);
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
      await TrackPlayer.play();
    } catch (err) {
      console.error("[RNTP] error en syncWithTrackPlayer]:", err);
    } finally {
      switchingRef.current = false;
    }
  }

  // NEXT determinista por índice + play
  function next() {
    if (queueIndex < 0) return;
    const ni = queueIndex + 1;
    if (ni >= queue.length) return;

    setQueueIndex(ni);
    setCurrentSong(queue[ni]);

    const doSkip = (TrackPlayer as any).skip?.bind(TrackPlayer);
    (async () => {
      try {
        if (doSkip) {
          await doSkip(ni);
          console.log("[next] skip →", ni);
        } else {
          await TrackPlayer.skipToNext();
          console.log("[next] skipToNext()");
        }
        await TrackPlayer.play();
        console.log("[next] play()");
      } catch (e) {
        console.error("[next] ERROR:", e);
      }
    })();
  }

  // PREV determinista por índice + play
  function prev() {
    if (queueIndex <= 0) return;
    const ni = queueIndex - 1;

    setQueueIndex(ni);
    setCurrentSong(queue[ni]);

    const doSkip = (TrackPlayer as any).skip?.bind(TrackPlayer);
    (async () => {
      try {
        if (doSkip) {
          await doSkip(ni);
          console.log("[prev] skip →", ni);
        } else {
          await TrackPlayer.skipToPrevious();
          console.log("[prev] skipToPrevious()");
        }
        await TrackPlayer.play();
        console.log("[prev] play()");
      } catch (e) {
        console.error("[prev] ERROR:", e);
      }
    })();
  }

  // Mantener provider en sync con cambios externos y PRE-WARM del siguiente
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

      // 🔥 pre-warm del siguiente tema para reducir lag en Next
      try {
        const BASE_URL = getBaseUrl();
        const nextItem = queue[pos + 1];
        if (BASE_URL && nextItem?.id) {
          warmResolve(String(nextItem.id), BASE_URL);
          console.log("[prefetch] warmed next:", nextItem.id);
        }
      } catch (e) {
        console.warn("[prefetch] warm next failed:", e);
      }
    };

    const subActive = TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, onActiveChanged);

    // ⬇️ cuando termina sin siguiente, pausar y volver a 0:00 si no hay repeat
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