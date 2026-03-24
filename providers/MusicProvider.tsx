import { useAuth } from "@/hooks/use-auth";
import { resolveAudioStream } from "@/services/audioStreamService";
import { logPlaybackError } from "@/services/errorLogService";
import { upgradeThumbUrl } from "@/utils/image-helpers";
import { ReactNode, useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { useCacheInvalidation } from "../hooks/use-cache-invalidation";
import { useMusicApi } from "../hooks/use-music-api";
import * as PlayerService from "../services/PlayerService";
import { MusicContext, PlaySource } from "./../context/MusicContext";
import { Song } from "./../types/music";

// STATE

interface PlayerState {
  currentSong: Song | null;
  queue: Song[];
  queueIndex: number;
  playSource: PlaySource | null;
  autoplayStartIndex: number;
  playbackError: string | null;
  isShuffled: boolean;
  queueBeforeShuffle: Song[];
  indexBeforeShuffle: number;
}

const initialState: PlayerState = {
  currentSong: null,
  queue: [],
  queueIndex: -1,
  playSource: null,
  autoplayStartIndex: 0,
  playbackError: null,
  isShuffled: false,
  queueBeforeShuffle: [],
  indexBeforeShuffle: -1,
};

// REDUCER

type PlayerAction =
  | { type: "PLAY_LIST"; queue: Song[]; index: number; source: PlaySource | null }
  | { type: "PLAY_SINGLE"; song: Song; source: PlaySource }
  | { type: "SET_INDEX"; index: number }
  | { type: "ADD_AUTOPLAY"; song: Song }
  | { type: "SHUFFLE_ON"; shuffled: Song[]; backup: Song[]; backupIndex: number }
  | { type: "SHUFFLE_OFF" }
  | { type: "SET_ERROR"; error: string | null };

function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case "PLAY_LIST": {
      const { queue, index, source } = action;
      return {
        ...state,
        queue,
        queueIndex: index,
        currentSong: queue[index] ?? null,
        playSource: source ?? { type: "queue", id: null, name: null, thumb: null },
        autoplayStartIndex: queue.length,
        playbackError: null,
        isShuffled: false,
        queueBeforeShuffle: [],
        indexBeforeShuffle: -1,
      };
    }

    case "PLAY_SINGLE": {
      const { song, source } = action;
      return {
        ...state,
        queue: [song],
        queueIndex: 0,
        currentSong: song,
        playSource: source,
        autoplayStartIndex: 1,
        playbackError: null,
        isShuffled: false,
        queueBeforeShuffle: [],
        indexBeforeShuffle: -1,
      };
    }

    case "SET_INDEX": {
      const { index } = action;
      if (index < 0 || index >= state.queue.length) return state;
      if (index === state.queueIndex) return state;
      return {
        ...state,
        queueIndex: index,
        currentSong: state.queue[index] ?? null,
      };
    }

    case "ADD_AUTOPLAY": {
      const newQueue = [...state.queue, action.song];
      return {
        ...state,
        queue: newQueue,
        queueIndex: newQueue.length - 1,
        currentSong: action.song,
      };
    }

    case "SHUFFLE_ON": {
      return {
        ...state,
        queue: action.shuffled,
        queueIndex: 0,
        isShuffled: true,
        queueBeforeShuffle: action.backup,
        indexBeforeShuffle: action.backupIndex,
      };
    }

    case "SHUFFLE_OFF": {
      const { queueBeforeShuffle, currentSong } = state;
      if (!queueBeforeShuffle.length) return state;

      const restoredIndex = currentSong
        ? queueBeforeShuffle.findIndex((s) => s.id === currentSong.id)
        : state.indexBeforeShuffle;

      return {
        ...state,
        queue: queueBeforeShuffle,
        queueIndex: restoredIndex >= 0 ? restoredIndex : 0,
        currentSong: restoredIndex >= 0 ? queueBeforeShuffle[restoredIndex] : state.currentSong,
        isShuffled: false,
        queueBeforeShuffle: [],
        indexBeforeShuffle: -1,
      };
    }

    case "SET_ERROR": {
      return { ...state, playbackError: action.error };
    }

    default:
      return state;
  }
}

//TODO MOVE {
// hELPERS
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

function resolveContextKey(list: Song[], source?: PlaySource | null) {
  if (!source) return null;
  if (source.type === "album") {
    const id = majorityId(list, (s) => s.album_id ?? null) || null;
    return id ? { key: `album:${id}`, kind: "album" as const, id } : null;
  }
  if (source.type === "artist") {
    const id = majorityId(list, (s) => s.artist_id ?? null) || null;
    return id ? { key: `artist:${id}`, kind: "artist" as const, id } : null;
  }
  if (source.type === "playlist") {
    const pid = source.id;
    return pid ? { key: `playlist:${pid}`, kind: "playlist" as const, id: pid } : null;
  }
  return null;
}

async function resolveUrl(songId: string): Promise<string | null> {
  try {
    const result = await resolveAudioStream(songId);
    return result?.stream?.url ?? null;
  } catch (err) {
    logPlaybackError({
      trackId: songId,
      errorMessage: err instanceof Error ? err.message : JSON.stringify(err),
    });
    return null;
  }
}

/** Construye el track con URL resuelta para PlayerService */
function toTrackInput(song: Song, url?: string | null): PlayerService.TrackInput {
  return {
    id: song.id,
    url: url ?? song.url,
    title: song.title,
    artist_name: song.artist_name ?? undefined,
    thumbnail: upgradeThumbUrl(song.thumbnail, 512),
    duration_seconds: song.duration_seconds,
  };
}

//TODO MOVE }

export function MusicProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(playerReducer, initialState);

  const { user } = useAuth();
  const userId = user?.id ?? undefined;
  const { logPlayAlbum, logPlayArtist, logPlayTrack } = useMusicApi();
  const { invalidateRecent } = useCacheInvalidation(userId);

  const autoplayProviderRef = useRef<(() => Song | null) | null>(null);
  const autoplayEnabledRef = useRef<(() => boolean) | null>(null);
  const playedAutoplayIdsRef = useRef<Set<string>>(new Set());
  const lastLoggedTrackIdRef = useRef<string | null>(null);
  const listenTimeRef = useRef<{
    trackId: string;
    accumulated: number;
    lastPosition: number;
  } | null>(null);
  const switchingRef = useRef(false);
  // guard para fallback de fin de track por posicion (PlaybackQueueEnded no confiable)
  const trackEndFiredRef = useRef<string | null>(null);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // PLAYBACK

  const playList = useCallback(
    async (list: Song[], startIndex: number, source?: PlaySource) => {
      if (switchingRef.current) return;
      switchingRef.current = true;
      playedAutoplayIdsRef.current.clear();
      lastLoggedTrackIdRef.current = null;

      try {
        const song = list[startIndex];
        const url = await resolveUrl(String(song.id));
        await PlayerService.playTrack(toTrackInput(song, url));

        const ctx = resolveContextKey(list, source);

        dispatch({
          type: "PLAY_LIST",
          queue: list,
          index: startIndex,
          source: source
            ? { ...source, id: ctx?.id ?? source.id ?? "" }
            : null,
        });

        if (ctx) {
          const meta = { name: source?.name ?? null, thumb: source?.thumb ?? null };
          if (ctx.kind === "album") logPlayAlbum(ctx.id, meta).catch(() => { });
          else if (ctx.kind === "artist") logPlayArtist(ctx.id, meta).catch(() => { });
          setTimeout(() => invalidateRecent().catch(() => { }), 2000);
        }
      } catch (err) {
        console.error("[playList] error:", err);
      } finally {
        switchingRef.current = false;
      }
    },
    [logPlayAlbum, logPlayArtist, invalidateRecent],
  );

  const playSingle = useCallback(
    async (song: Song, source: PlaySource) => {
      if (switchingRef.current) return;
      switchingRef.current = true;
      playedAutoplayIdsRef.current.clear();
      lastLoggedTrackIdRef.current = null;

      try {
        const url = await resolveUrl(String(song.id));
        await PlayerService.playTrack(toTrackInput(song, url));
        dispatch({ type: "PLAY_SINGLE", song, source });
      } catch (err) {
        console.error("[playSingle] error:", err);
      } finally {
        switchingRef.current = false;
      }
    },
    [],
  );

  const next = useCallback(async () => {
    const { queue, queueIndex } = stateRef.current;
    const ni = queueIndex + 1;

    if (ni < queue.length) {
      const song = queue[ni];
      const url = await resolveUrl(String(song.id));
      await PlayerService.switchTrack(toTrackInput(song, url));
      dispatch({ type: "SET_INDEX", index: ni });
      lastLoggedTrackIdRef.current = null;
      return;
    }

    if (autoplayEnabledRef.current?.() && autoplayProviderRef.current) {
      let nextSong: Song | null = null;
      let attempts = 0;
      while (attempts < 10) {
        nextSong = autoplayProviderRef.current();
        if (!nextSong || !playedAutoplayIdsRef.current.has(String(nextSong.id))) break;
        attempts++;
      }

      if (nextSong && !playedAutoplayIdsRef.current.has(String(nextSong.id))) {
        playedAutoplayIdsRef.current.add(String(nextSong.id));
        const url = await resolveUrl(String(nextSong.id));
        await PlayerService.switchTrack(toTrackInput(nextSong, url));
        dispatch({ type: "ADD_AUTOPLAY", song: nextSong });
        lastLoggedTrackIdRef.current = null;
        return;
      }
    }
  }, []);

  const prev = useCallback(async () => {
    const { queue, queueIndex } = stateRef.current;

    try {
      const position = await PlayerService.getPosition();
      if (position > 3) {
        await PlayerService.seekTo(0);
        return;
      }
    } catch { }

    const ni = queueIndex - 1;
    if (ni < 0) {
      await PlayerService.seekTo(0);
      return;
    }

    const song = queue[ni];
    dispatch({ type: "SET_INDEX", index: ni });
    lastLoggedTrackIdRef.current = null;

    const url = await resolveUrl(String(song.id));
    await PlayerService.switchTrack(toTrackInput(song, url));
  }, []);

  const skipTo = useCallback(async (index: number) => {
    const { queue } = stateRef.current;
    if (index < 0 || index >= queue.length) return;

    const song = queue[index];

    dispatch({ type: "SET_INDEX", index });
    lastLoggedTrackIdRef.current = null;

    const url = await resolveUrl(String(song.id));
    await PlayerService.switchTrack(toTrackInput(song, url));
  }, []);

  const addToQueueAndPlay = useCallback(async (song: Song) => {
    const { queue } = stateRef.current;
    if (queue.some((s) => String(s.id) === String(song.id))) return;

    playedAutoplayIdsRef.current.add(String(song.id));
    dispatch({ type: "ADD_AUTOPLAY", song });
    lastLoggedTrackIdRef.current = null;

    const url = await resolveUrl(String(song.id));
    await PlayerService.switchTrack(toTrackInput(song, url));
  }, []);

  // SHUFFLE

  const toggleShuffle = useCallback(() => {
    const { queue, queueIndex, currentSong, isShuffled, autoplayStartIndex } =
      stateRef.current;
    if (autoplayStartIndex <= 1) return;
    if (!currentSong) return;

    if (isShuffled) {
      dispatch({ type: "SHUFFLE_OFF" });
      return;
    }

    const original = queue.slice(0, autoplayStartIndex);
    const autoplay = queue.slice(autoplayStartIndex);
    const others = original.filter((s) => s.id !== currentSong.id);

    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [others[i], others[j]] = [others[j], others[i]];
    }

    const shuffled = [currentSong, ...others, ...autoplay];

    dispatch({
      type: "SHUFFLE_ON",
      shuffled,
      backup: [...queue],
      backupIndex: queueIndex,
    });
  }, []);

  // AUTOPLAY SETUP

  const setAutoplayProvider = useCallback(
    (fn: (() => Song | null) | null) => {
      autoplayProviderRef.current = fn;
    },
    [],
  );

  const setAutoplayEnabled = useCallback(
    (fn: (() => boolean) | null) => {
      autoplayEnabledRef.current = fn;
    },
    [],
  );

  // LISTENERS

  useEffect(() => {
    const subProgress = PlayerService.onProgress(
      async ({ position, duration }) => {
        const { queue, queueIndex } = stateRef.current;
        const track = queue[queueIndex];
        if (!track) return;

        const trackId = String(track.id);

        // acumular tiempo de escucha
        if (!listenTimeRef.current || listenTimeRef.current.trackId !== trackId) {
          listenTimeRef.current = { trackId, accumulated: 0, lastPosition: position };
          return;
        }

        // repeat detection: position saltó para atrás (loop)
        if (position < listenTimeRef.current.lastPosition - 5) {
          listenTimeRef.current = { trackId, accumulated: 0, lastPosition: position };
          lastLoggedTrackIdRef.current = null;
          return;
        }

        const delta = position - listenTimeRef.current.lastPosition;
        if (delta > 0 && delta < 3) {
          listenTimeRef.current.accumulated += delta;
        }
        listenTimeRef.current.lastPosition = position;

        // Log a los 30s
        if (listenTimeRef.current.accumulated >= 30 && lastLoggedTrackIdRef.current !== trackId) {
          lastLoggedTrackIdRef.current = trackId;
          logPlayTrack(trackId, {
            album_id: track.album_id ?? undefined,
            album_name: track.album_name,
            artist_id: track.artist_id ?? undefined,
            artist_name: track.artist_name ?? undefined,
            track_name: track.title,
            duration_seconds: track.duration_seconds,
            thumbnail_url: track.thumbnail,
          }).catch(() => { });
        }

        // Preload a 15s del final
        if (duration > 0 && duration - position <= 15) {
          const nextIndex = queueIndex + 1;
          if (nextIndex < queue.length) {
            const nextSong = queue[nextIndex];
            const url = await resolveUrl(String(nextSong.id));
            if (url) {
              await PlayerService.preloadNext(toTrackInput(nextSong, url));
            }
          }
        }

        // Fallback por posicion: PlaybackQueueEnded no dispara confiablemente
        // cuando la duracion reportada difiere del stream real.
        // Guard via trackEndFiredRef evita disparo doble.
        if (duration > 0 && duration - position < 0.8) {
          if (trackEndFiredRef.current !== trackId) {
            trackEndFiredRef.current = trackId;
            next();
          }
        }
      },
    );

    const subEnded = PlayerService.onTrackEnd(async () => {
      const { queue, queueIndex } = stateRef.current;
      // iOS FIX: marcar el track como procesado para que el fallback de onProgress no duplique.
      const track = queue[queueIndex];
      if (track) trackEndFiredRef.current = String(track.id);

      const ni = queueIndex + 1;

      if (ni < queue.length) {
        const skipped = await PlayerService.skipToPreloaded();
        if (skipped) {
          dispatch({ type: "SET_INDEX", index: ni });
          lastLoggedTrackIdRef.current = null;
          return;
        }
        const song = queue[ni];
        const url = await resolveUrl(String(song.id));
        await PlayerService.switchTrack(toTrackInput(song, url));
        dispatch({ type: "SET_INDEX", index: ni });
        lastLoggedTrackIdRef.current = null;
        return;
      }

      if (autoplayEnabledRef.current?.() && autoplayProviderRef.current) {
        let nextSong: Song | null = null;
        let attempts = 0;
        while (attempts < 10) {
          nextSong = autoplayProviderRef.current();
          if (!nextSong || !playedAutoplayIdsRef.current.has(String(nextSong.id))) break;
          attempts++;
        }

        if (nextSong && !playedAutoplayIdsRef.current.has(String(nextSong.id))) {
          playedAutoplayIdsRef.current.add(String(nextSong.id));
          const url = await resolveUrl(String(nextSong.id));
          await PlayerService.switchTrack(toTrackInput(nextSong, url));
          dispatch({ type: "ADD_AUTOPLAY", song: nextSong });
          lastLoggedTrackIdRef.current = null;
          return;
        }
      }

      await PlayerService.pause();
    });

    const subError = PlayerService.onError((err: unknown) => {
      //console.warn("[playback] Error:", err);
      const { queue, queueIndex } = stateRef.current;
      const track = queue[queueIndex];

      if (track) {
        logPlaybackError({
          trackId: String(track.id),
          errorMessage: err instanceof Error ? err.message : JSON.stringify(err),
        });
      }

      dispatch({ type: "SET_ERROR", error: "No se pudo reproducir la cancion" });
      setTimeout(() => dispatch({ type: "SET_ERROR", error: null }), 4000);
    });

    const subRemoteNext = PlayerService.onRemoteNext(() => { next(); });
    const subRemotePrev = PlayerService.onRemotePrev(() => { prev(); });

    return () => {
      subProgress.remove();
      subEnded.remove();
      subError.remove();
      subRemoteNext.remove();
      subRemotePrev.remove();
    };
  }, [logPlayTrack, next, prev]);

  const value = useMemo(
    () => ({
      currentSong: state.currentSong,
      queue: state.queue,
      queueIndex: state.queueIndex,
      playSource: state.playSource,
      isShuffled: state.isShuffled,
      autoplayStartIndex: state.autoplayStartIndex,
      playbackError: state.playbackError,
      playList,
      playSingle,
      next,
      prev,
      skipTo,
      toggleShuffle,
      addToQueueAndPlay,
      setAutoplayProvider,
      setAutoplayEnabled,
    }),
    [
      state.currentSong,
      state.queue,
      state.queueIndex,
      state.playSource,
      state.isShuffled,
      state.autoplayStartIndex,
      state.playbackError,
      playList,
      playSingle,
      next,
      prev,
      skipTo,
      toggleShuffle,
      addToQueueAndPlay,
      setAutoplayProvider,
      setAutoplayEnabled,
    ],
  );

  return (
    <MusicContext.Provider value={value}>{children}</MusicContext.Provider>
  );
}