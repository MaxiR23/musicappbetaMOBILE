import { useAuth } from "@/hooks/use-auth";
import Constants from "expo-constants";
import { ReactNode, useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import TrackPlayer, { Event, RepeatMode, TrackType } from "react-native-track-player";
import { useCacheInvalidation } from "../hooks/use-cache-invalidation";
import { useMusicApi } from "../hooks/use-music-api";
import { ensureTrackPlayer } from "../services/setupTrackPlayer";
import { syncWithTrackPlayer } from "../services/syncWithTrackPlayer";
import { MusicContext } from "./../context/MusicContext";
import { Song } from "./../types/music";

// ============================================================================
// TYPES
// ============================================================================

type PlaySource =
  | { type: "playlist"; id?: string | null; name?: string | null; thumb?: string | null }
  | { type: "album"; id?: string | null; name?: string | null; thumb?: string | null }
  | { type: "artist"; id?: string | null; name?: string | null; thumb?: string | null }
  | { type: "queue"; id?: string | null; name?: string | null; thumb?: string | null }
  | { type: "related"; id: string; name?: string | null; thumb?: string | null }
  | { type: "search"; id: string; name?: string | null; thumb?: string | null };

interface PlayerState {
  currentSong: Song | null;
  queue: Song[];
  queueIndex: number;
  playSource: PlaySource | null;
  originalQueueSize: number;
  initialQueueSize: number;
  playbackError: string | null;
  isShuffled: boolean;
  originalQueueBeforeShuffle: Song[];
  originalIndexBeforeShuffle: number;
}

// ============================================================================
// REDUCER
// ============================================================================

type PlayerAction =
  | { type: "PLAY_FROM_LIST"; payload: { queue: Song[]; index: number; source: PlaySource | null } }
  | { type: "PLAY_SINGLE"; payload: { song: Song; source: PlaySource } }
  | { type: "SET_INDEX"; payload: { index: number } }
  | { type: "ADD_AND_PLAY"; payload: { song: Song; insertPosition: number } }
  | { type: "ADD_AUTOPLAY"; payload: { song: Song } }
  | { type: "SHUFFLE_ON"; payload: { shuffledQueue: Song[]; originalQueue: Song[]; originalIndex: number } }
  | { type: "SHUFFLE_OFF"; payload: { originalQueue: Song[]; newIndex: number } }
  | { type: "SET_ERROR"; payload: { error: string | null } }
  | { type: "UPDATE_SOURCE"; payload: { source: PlaySource } };

const initialState: PlayerState = {
  currentSong: null,
  queue: [],
  queueIndex: -1,
  playSource: null,
  originalQueueSize: 0,
  initialQueueSize: 0,
  playbackError: null,
  isShuffled: false,
  originalQueueBeforeShuffle: [],
  originalIndexBeforeShuffle: -1,
};

function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case "PLAY_FROM_LIST": {
      const { queue, index, source } = action.payload;
      return {
        ...state,
        queue,
        queueIndex: index,
        currentSong: queue[index] ?? null,
        originalQueueSize: queue.length,
        initialQueueSize: queue.length,
        playSource: source ?? { type: "queue", id: null, name: null, thumb: null },
        isShuffled: false,
        originalQueueBeforeShuffle: [],
        originalIndexBeforeShuffle: -1,
      };
    }

    case "PLAY_SINGLE": {
      const { song, source } = action.payload;
      return {
        ...state,
        queue: [song],
        queueIndex: 0,
        currentSong: song,
        originalQueueSize: 1,
        initialQueueSize: 1,
        playSource: source,
        isShuffled: false,
        originalQueueBeforeShuffle: [],
        originalIndexBeforeShuffle: -1,
      };
    }

    case "SET_INDEX": {
      const { index } = action.payload;
      if (index < 0 || index >= state.queue.length) return state;
      if (index === state.queueIndex) return state;
      return {
        ...state,
        queueIndex: index,
        currentSong: state.queue[index] ?? null,
      };
    }

    case "ADD_AND_PLAY": {
      const { song, insertPosition } = action.payload;
      const newQueue = [...state.queue];
      newQueue.splice(insertPosition, 0, song);
      return {
        ...state,
        queue: newQueue,
        queueIndex: insertPosition,
        currentSong: song,
        originalQueueSize: state.originalQueueSize + 1,
      };
    }

    case "ADD_AUTOPLAY": {
      const { song } = action.payload;
      const newQueue = [...state.queue, song];
      const newIndex = state.queue.length;
      return {
        ...state,
        queue: newQueue,
        queueIndex: newIndex,
        currentSong: song,
        originalQueueSize: state.originalQueueSize + 1,
      };
    }

    case "SHUFFLE_ON": {
      const { shuffledQueue, originalQueue, originalIndex } = action.payload;
      return {
        ...state,
        queue: shuffledQueue,
        queueIndex: 0,
        isShuffled: true,
        originalQueueBeforeShuffle: originalQueue,
        originalIndexBeforeShuffle: originalIndex,
      };
    }

    case "SHUFFLE_OFF": {
      const { originalQueue, newIndex } = action.payload;
      return {
        ...state,
        queue: originalQueue,
        queueIndex: newIndex,
        isShuffled: false,
        originalQueueBeforeShuffle: [],
        originalIndexBeforeShuffle: -1,
      };
    }

    case "SET_ERROR": {
      return { ...state, playbackError: action.payload.error };
    }

    case "UPDATE_SOURCE": {
      return { ...state, playSource: action.payload.source };
    }

    default:
      return state;
  }
}

// ============================================================================
// PROVIDER
// ============================================================================

export function MusicProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(playerReducer, initialState);

  const { user } = useAuth();
  const userId = user?.id ?? undefined;
  const { logPlayAlbum, logPlayArtist, logPlayTrack } = useMusicApi();
  const { invalidateRecent } = useCacheInvalidation(userId);

  // === REFS ===
  const autoplayProviderRef = useRef<(() => Song | null) | null>(null);
  const isAutoplayEnabledRef = useRef<(() => boolean) | null>(null);
  const playedAutoplayIdsRef = useRef<Set<string>>(new Set());
  const lastProcessedTrackRef = useRef<string | null>(null);

  const syncingRef = useRef(false);
  const switchingRef = useRef(false);
  const lastLoggedContextKeyRef = useRef<string | null>(null);
  const lastLoadedContextKeyRef = useRef<string | null>(null);
  const lastLoggedTrackIdRef = useRef<string | null>(null);
  const listenTimeRef = useRef<{ trackId: string; accumulated: number; lastPosition: number } | null>(null);
  const endingRef = useRef(false);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // === HELPERS ===

  function getBaseUrl() {
    return (
      (process.env.EXPO_PUBLIC_API_URL as string | undefined) ??
      ((Constants?.expoConfig as any)?.extra?.EXPO_PUBLIC_API_URL as string | undefined) ??
      null
    );
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
  ): { key: string; kind: "album" | "artist" | "playlist"; id: string } | null {
    if (!source) return null;
    if (source.type === "album") {
      const album_id = majorityId(list, (s: any) => s.album_id ?? null) || null;
      return album_id ? { key: `album:${album_id}`, kind: "album", id: album_id } : null;
    }
    if (source.type === "artist") {
      const artist_id = majorityId(list, (s: any) => s.artist_id ?? null) || null;
      return artist_id ? { key: `artist:${artist_id}`, kind: "artist", id: artist_id } : null;
    }
    if (source.type === "playlist") {
      const pid = (source as any).id;
      return pid ? { key: `playlist:${pid}`, kind: "playlist", id: pid } : null;
    }
    return null;
  }

  function isAutoplayEnabled(): boolean {
    return isAutoplayEnabledRef.current?.() ?? false;
  }

  function buildTrack(song: Song, baseUrl: string) {
    return {
      id: String(song.id),
      url: `${baseUrl}/music/play?id=${encodeURIComponent(song.id)}&redir=2`,
      title: (song as any).title,
      artist: (song as any).artist_name ?? (song as any).artist ?? "",
      artwork: (song as any).thumbnail ?? (song as any).thumbnail_url ?? undefined,
      type: TrackType.Default,
      headers: {
        Range: "bytes=0-",
        "Accept-Encoding": "identity",
        Connection: "keep-alive",
      },
    };
  }

  // === PLAYBACK FUNCTIONS ===

  const playFromList = useCallback(async (list: Song[], startIndex: number, source?: PlaySource) => {
    const t0 = Date.now();
    console.log("[playFromList] START");

    if (switchingRef.current) return;
    switchingRef.current = true;

    playedAutoplayIdsRef.current.clear();

    const ctx = resolveContextKey(list, source);
    const isSameContext = ctx != null && lastLoadedContextKeyRef.current === ctx.key;

    try {
      if (isSameContext) {
        await ensureTrackPlayer();
        await TrackPlayer.skip(startIndex);
        await TrackPlayer.play();
        console.log("[playFromList] sameContext done:", Date.now() - t0, "ms");
      } else {
        await syncWithTrackPlayer(list, startIndex, getBaseUrl()!, syncingRef);
        console.log("[playFromList] syncWithTrackPlayer done:", Date.now() - t0, "ms");
        lastLoadedContextKeyRef.current = ctx?.key ?? null;
      }
    } catch (err) {
      console.error("[RNTP] error:", err);
      switchingRef.current = false;
      return;
    }

    console.log("[playFromList] before dispatch:", Date.now() - t0, "ms");
    dispatch({
      type: "PLAY_FROM_LIST",
      payload: {
        queue: list,
        index: startIndex,
        source: source ? { ...source, id: ctx?.id ?? null } : null,
      },
    });
    console.log("[playFromList] after dispatch:", Date.now() - t0, "ms");

    if (ctx && !isSameContext) {
      lastLoggedContextKeyRef.current = ctx.key;
      const srcMeta = { name: source?.name ?? null, thumb: source?.thumb ?? null };
      if (ctx.kind === "album") {
        logPlayAlbum(ctx.id, srcMeta).catch(() => {});
      } else if (ctx.kind === "artist") {
        logPlayArtist(ctx.id, srcMeta).catch(() => {});
      }
      setTimeout(() => invalidateRecent().catch(() => {}), 2000);
    }

    switchingRef.current = false;
    console.log("[playFromList] DONE:", Date.now() - t0, "ms");
  }, [logPlayAlbum, logPlayArtist, invalidateRecent]);

  const playFromRelated = useCallback(async (song: Song) => {
    if (switchingRef.current) return;
    switchingRef.current = true;

    playedAutoplayIdsRef.current.clear();
    lastLoggedContextKeyRef.current = null;

    try {
      await syncWithTrackPlayer([song], 0, getBaseUrl()!, syncingRef);
    } catch (err) {
      console.error("[RNTP] error en syncWithTrackPlayer:", err);
      switchingRef.current = false;
      return;
    }

    dispatch({
      type: "PLAY_SINGLE",
      payload: {
        song,
        source: { type: "related", id: String(song.id), name: "Recommended", thumb: null },
      },
    });

    switchingRef.current = false;
  }, []);

  const playFromSearch = useCallback(async (song: Song) => {
    if (switchingRef.current) return;
    switchingRef.current = true;

    playedAutoplayIdsRef.current.clear();
    lastLoggedContextKeyRef.current = null;

    try {
      await syncWithTrackPlayer([song], 0, getBaseUrl()!, syncingRef);
    } catch (err) {
      console.error("[playFromSearch] error:", err);
      switchingRef.current = false;
      return;
    }

    dispatch({
      type: "PLAY_SINGLE",
      payload: {
        song,
        source: { type: "search", id: String(song.id), name: (song as any).title ?? null, thumb: null },
      },
    });

    switchingRef.current = false;
  }, []);

  const addToQueueAndPlay = useCallback(async (song: Song) => {
    const { queue, originalQueueSize } = stateRef.current;
    console.log("[CASO 1] Click en autoplay:", (song as any).title);

    const alreadyExists = queue.some((s) => String(s.id) === String(song.id));
    if (alreadyExists) {
      console.log("Cancion ya existe en cola");
      return;
    }

    playedAutoplayIdsRef.current.add(String(song.id));
    const insertPosition = originalQueueSize;
    const newQueue = [...queue];
    newQueue.splice(insertPosition, 0, song);

    dispatch({
      type: "ADD_AND_PLAY",
      payload: { song, insertPosition },
    });

    try {
      syncingRef.current = true;
      await syncWithTrackPlayer(newQueue, insertPosition, getBaseUrl()!, syncingRef);
      console.log("TrackPlayer re-sincronizado en posicion", insertPosition);
    } catch (e) {
      console.error("[addToQueueAndPlay] ERROR:", e);
    } finally {
      syncingRef.current = false;
    }
  }, []);

  const next = useCallback(async () => {
    const { queue, queueIndex } = stateRef.current;
    if (queueIndex < 0) return;

    const ni = queueIndex + 1;

    if (ni < queue.length) {
      dispatch({ type: "SET_INDEX", payload: { index: ni } });
      try {
        await TrackPlayer.skipToNext();
      } catch (e) {
        console.error("[next] ERROR:", e);
      }
      return;
    }

    if (isAutoplayEnabled() && autoplayProviderRef.current) {
      let nextAutoplaySong = autoplayProviderRef.current();
      let attempts = 0;
      while (nextAutoplaySong && playedAutoplayIdsRef.current.has(String(nextAutoplaySong.id)) && attempts < 10) {
        nextAutoplaySong = autoplayProviderRef.current();
        attempts++;
      }

      if (nextAutoplaySong && !playedAutoplayIdsRef.current.has(String(nextAutoplaySong.id))) {
        console.log("[CASO 2] Agregando autoplay automatico:", (nextAutoplaySong as any).title);
        playedAutoplayIdsRef.current.add(String(nextAutoplaySong.id));

        dispatch({ type: "ADD_AUTOPLAY", payload: { song: nextAutoplaySong } });

        try {
          await TrackPlayer.add(buildTrack(nextAutoplaySong, getBaseUrl()!) as any);
          await TrackPlayer.skipToNext();
        } catch (e) {
          console.error("[next] ERROR agregando autoplay:", e);
        }
        return;
      }
    }

    console.log("Ultima cancion, sin autoplay");
  }, []);

  const skipToIndex = useCallback(async (index: number) => {
    const { queue } = stateRef.current;
    if (index < 0 || index >= queue.length) {
      console.warn("[skipToIndex] indice fuera de rango:", index);
      return;
    }

    dispatch({ type: "SET_INDEX", payload: { index } });

    try {
      await TrackPlayer.skip(index);
      await TrackPlayer.play();
    } catch (e) {
      console.error("[skipToIndex] ERROR:", e);
    }
  }, []);

  const prev = useCallback(async () => {
    const { queueIndex } = stateRef.current;
    if (queueIndex < 0) return;

    try {
      const position = await TrackPlayer.getPosition();
      if (position > 3) {
        await TrackPlayer.seekTo(0);
        await TrackPlayer.play();
        return;
      }
    } catch (e) {
      console.error("[prev] ERROR obteniendo posicion:", e);
    }

    const ni = queueIndex - 1;

    if (ni < 0) {
      try {
        await TrackPlayer.seekTo(0);
        await TrackPlayer.play();
      } catch (e) {
        console.error("[prev] ERROR (seekTo 0):", e);
      }
      return;
    }

    dispatch({ type: "SET_INDEX", payload: { index: ni } });

    try {
      await TrackPlayer.skipToPrevious();
      await TrackPlayer.play();
    } catch (e) {
      console.error("[prev] ERROR (skipToPrevious):", e);
    }
  }, []);

  const toggleShuffle = useCallback(async () => {
    const { queue, queueIndex, originalQueueSize, currentSong, isShuffled, originalQueueBeforeShuffle } = stateRef.current;

    if (originalQueueSize <= 1) {
      console.log("[SHUFFLE] No hay suficientes temas para shuffle");
      return;
    }

    const currentSongId = currentSong?.id;
    if (!currentSongId) {
      console.warn("[SHUFFLE] No hay cancion actual");
      return;
    }

    const BASE_URL = getBaseUrl();
    if (!BASE_URL) return;

    if (isShuffled) {
      console.log("[SHUFFLE OFF] Restaurando orden original...");

      const currentSongIndexInOriginal = originalQueueBeforeShuffle.findIndex((s) => s.id === currentSongId);
      if (currentSongIndexInOriginal === -1) {
        console.warn("[SHUFFLE OFF] No se encontro la cancion en la queue original");
        return;
      }

      dispatch({
        type: "SHUFFLE_OFF",
        payload: { originalQueue: originalQueueBeforeShuffle, newIndex: currentSongIndexInOriginal },
      });

      try {
        switchingRef.current = true;
        syncingRef.current = true;
        await ensureTrackPlayer();

        const currentTrackIndex = await TrackPlayer.getActiveTrackIndex();
        const allTracks = await TrackPlayer.getQueue();
        const indicesToRemove = allTracks.map((_, idx) => idx).filter((idx) => idx !== currentTrackIndex);

        for (let i = indicesToRemove.length - 1; i >= 0; i--) {
          await TrackPlayer.remove(indicesToRemove[i]);
        }

        const tracksBeforeCurrent = originalQueueBeforeShuffle
          .slice(0, currentSongIndexInOriginal)
          .reverse()
          .map((s) => buildTrack(s, BASE_URL));

        for (const track of tracksBeforeCurrent) {
          await TrackPlayer.add(track as any, 0);
        }

        const tracksAfterCurrent = originalQueueBeforeShuffle
          .slice(currentSongIndexInOriginal + 1)
          .map((s) => buildTrack(s, BASE_URL));

        if (tracksAfterCurrent.length > 0) {
          await TrackPlayer.add(tracksAfterCurrent as any);
        }

        console.log("[SHUFFLE OFF] Orden original restaurado");
      } catch (e) {
        console.error("[SHUFFLE OFF] Error:", e);
      } finally {
        syncingRef.current = false;
        switchingRef.current = false;
      }

      return;
    }

    console.log("[SHUFFLE ON] Mezclando temas originales...");

    const originalTracks = queue.slice(0, originalQueueSize);
    const autoplayTracks = queue.slice(originalQueueSize);
    const otherOriginalTracks = originalTracks.filter((s) => s.id !== currentSongId);

    for (let i = otherOriginalTracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [otherOriginalTracks[i], otherOriginalTracks[j]] = [otherOriginalTracks[j], otherOriginalTracks[i]];
    }

    const shuffledQueue = [currentSong!, ...otherOriginalTracks, ...autoplayTracks];

    dispatch({
      type: "SHUFFLE_ON",
      payload: { shuffledQueue, originalQueue: [...queue], originalIndex: queueIndex },
    });

    try {
      switchingRef.current = true;
      syncingRef.current = true;
      await ensureTrackPlayer();

      const currentTrackIndex = await TrackPlayer.getActiveTrackIndex();
      const allTracks = await TrackPlayer.getQueue();
      const indicesToRemove = allTracks.map((_, idx) => idx).filter((idx) => idx !== currentTrackIndex);

      for (let i = indicesToRemove.length - 1; i >= 0; i--) {
        await TrackPlayer.remove(indicesToRemove[i]);
      }

      const tracksToAdd = shuffledQueue.slice(1).map((s) => buildTrack(s, BASE_URL));

      if (tracksToAdd.length > 0) {
        await TrackPlayer.add(tracksToAdd as any);
      }

      console.log("[SHUFFLE ON] Queue mezclada");
    } catch (e) {
      console.error("[SHUFFLE ON] Error:", e);
    } finally {
      syncingRef.current = false;
      switchingRef.current = false;
    }
  }, []);

  const setAutoplayProvider = useCallback((provider: (() => Song | null) | null) => {
    autoplayProviderRef.current = provider;
  }, []);

  const setIsAutoplayEnabledCallback = useCallback((callback: (() => boolean) | null) => {
    isAutoplayEnabledRef.current = callback;
  }, []);

  const setCurrentSong = useCallback((song: Song | null) => {
    if (!song) return;
    const { queue } = stateRef.current;
    const index = queue.findIndex((s) => s.id === song.id);
    if (index >= 0) {
      dispatch({ type: "SET_INDEX", payload: { index } });
    }
  }, []);

  // === TRACK PLAYER LISTENERS ===

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
        const { queue } = stateRef.current;
        const pos = queue.findIndex((s) => String(s.id) === String(activeId));
        return pos >= 0 ? pos : null;
      } catch {
        return null;
      }
    };

    const onActiveChanged = async () => {
      if (syncingRef.current) return;
      if (switchingRef.current) return;

      const pos = await findActiveIndex();
      if (pos == null) return;

      const { queue, currentSong, queueIndex } = stateRef.current;
      const newTrackId = queue[pos] ? String(queue[pos].id) : null;
      const prevTrackId = currentSong ? String(currentSong.id) : null;

      if (newTrackId === lastProcessedTrackRef.current) return;

      if (newTrackId && newTrackId !== prevTrackId) {
        lastLoggedTrackIdRef.current = null;
      }

      if (pos === queueIndex) return;

      dispatch({ type: "SET_INDEX", payload: { index: pos } });
    };

    const onProgress = async (progress: { position: number }) => {
      const { queue, queueIndex } = stateRef.current;
      if (queueIndex < 0) return;

      const trackToLog = queue[queueIndex];
      if (!trackToLog) return;

      const trackId = String(trackToLog.id);
      const currentPosition = progress.position;

      if (!listenTimeRef.current || listenTimeRef.current.trackId !== trackId) {
        listenTimeRef.current = { trackId, accumulated: 0, lastPosition: currentPosition };
        return;
      }

      const delta = currentPosition - listenTimeRef.current.lastPosition;
      const isNormalPlayback = delta > 0 && delta < 3;

      if (isNormalPlayback) {
        listenTimeRef.current.accumulated += delta;
      }

      listenTimeRef.current.lastPosition = currentPosition;

      if (listenTimeRef.current.accumulated >= 30) {
        const alreadyLogged = lastLoggedTrackIdRef.current === trackId;

        if (!alreadyLogged) {
          lastLoggedTrackIdRef.current = trackId;

          const trackContext = {
            album_id: (trackToLog as any).album_id,
            album_name: (trackToLog as any).album_name,
            artist_id: (trackToLog as any).artist_id,
            artist_name: (trackToLog as any).artist_name,
            track_name: (trackToLog as any).title,
            duration_seconds: (trackToLog as any).duration_seconds,
            thumbnail_url: (trackToLog as any).thumbnail ?? (trackToLog as any).thumbnail_url ?? null,
          };

          logPlayTrack(trackId, trackContext).catch(() => {});
        }
      }
    };

    const onQueueEnded = async () => {
      if (syncingRef.current) return;
      if (endingRef.current) return;
      endingRef.current = true;

      try {
        console.log("PlaybackQueueEnded disparado - verificando autoplay...");

        if (isAutoplayEnabledRef.current && autoplayProviderRef.current) {
          const isEnabled = isAutoplayEnabledRef.current();

          if (isEnabled) {
            let nextAutoplaySong = autoplayProviderRef.current();
            let attempts = 0;
            while (nextAutoplaySong && playedAutoplayIdsRef.current.has(String(nextAutoplaySong.id)) && attempts < 10) {
              nextAutoplaySong = autoplayProviderRef.current();
              attempts++;
            }

            if (nextAutoplaySong && !playedAutoplayIdsRef.current.has(String(nextAutoplaySong.id))) {
              console.log("[CASO 2] Agregando siguiente autoplay:", (nextAutoplaySong as any).title);
              playedAutoplayIdsRef.current.add(String(nextAutoplaySong.id));

              await TrackPlayer.add(buildTrack(nextAutoplaySong, getBaseUrl()!) as any);
              dispatch({ type: "ADD_AUTOPLAY", payload: { song: nextAutoplaySong } });
              await TrackPlayer.skipToNext();

              endingRef.current = false;
              return;
            }
          }
        }

        console.log("No hay mas autoplay, pausando al final");
        const { queue } = stateRef.current;
        const lastIdx = Math.max(0, queue.length - 1);
        const lastSong = queue[lastIdx];
        if (!lastSong) {
          endingRef.current = false;
          return;
        }

        await TrackPlayer.setRepeatMode(RepeatMode.Off).catch(() => {});
        await TrackPlayer.skip(lastIdx).catch(() => {});
        await TrackPlayer.pause().catch(() => {});
        await TrackPlayer.seekTo(0).catch(() => {});

        dispatch({ type: "SET_INDEX", payload: { index: lastIdx } });
      } catch (e) {
        console.warn("[ended] Error:", e);
      } finally {
        endingRef.current = false;
      }
    };

    const onError = (error: any) => {
      console.warn("[playback] Error:", error);
      dispatch({ type: "SET_ERROR", payload: { error: "No se pudo reproducir la cancion" } });
      setTimeout(() => dispatch({ type: "SET_ERROR", payload: { error: null } }), 4000);
    };

    const subActive = TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, onActiveChanged);
    const subProgress = TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, onProgress);
    const subEnded = TrackPlayer.addEventListener(Event.PlaybackQueueEnded, onQueueEnded);
    const subError = TrackPlayer.addEventListener(Event.PlaybackError, onError);

    return () => {
      subActive.remove();
      subProgress.remove();
      subEnded.remove();
      subError.remove();
    };
  }, [logPlayTrack]);

  // === CONTEXT VALUE ===

  const value = useMemo(
    () => ({
      currentSong: state.currentSong,
      setCurrentSong,
      queue: state.queue,
      queueIndex: state.queueIndex,
      playFromList,
      playFromRelated,
      playFromSearch,
      next,
      skipToIndex,
      prev,
      shuffle: toggleShuffle,
      isShuffled: state.isShuffled,
      playSource: state.playSource,
      originalQueueSize: state.originalQueueSize,
      initialQueueSize: state.initialQueueSize,
      addToQueueAndPlay,
      setAutoplayProvider,
      setIsAutoplayEnabledCallback,
      isAutoplayEnabled,
      playbackError: state.playbackError,
    }),
    [
      state.currentSong,
      state.queue,
      state.queueIndex,
      state.playSource,
      state.originalQueueSize,
      state.initialQueueSize,
      state.isShuffled,
      state.playbackError,
      setCurrentSong,
      playFromList,
      playFromRelated,
      playFromSearch,
      next,
      skipToIndex,
      prev,
      toggleShuffle,
      addToQueueAndPlay,
      setAutoplayProvider,
      setIsAutoplayEnabledCallback,
    ]
  );

  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
}