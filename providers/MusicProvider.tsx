import { useAuth } from "@/hooks/use-auth";
import { getOfflineTrack } from "@/lib/offlineItems";
import { resolveAudioStream } from "@/services/audioStreamService";
import { logPlaybackError } from "@/services/errorLogService";
import { upgradeThumbUrl } from "@/utils/image-helpers";
import { ReactNode, useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { State, usePlaybackState } from "react-native-track-player";
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
  const playbackState = usePlaybackState();
  const isPlaying =
    playbackState.state === State.Playing ||
    playbackState.state === State.Buffering;

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

  // switchingRef: gate global. Mientras esta en true, el listener de
  // onProgress NO loguea, NO acumula tiempo y NO dispara avance por
  // fallback de posicion. Asi evitamos que durante una transicion
  // (resolveUrl + playTrack/switchTrack, cientos de ms) el listener
  // lea queue/queueIndex stale y duplique logs o dispare advance.
  const switchingRef = useRef(false);

  // Guard unico para fin de track: almacena el queueIndex ya procesado.
  // Tanto onTrackEnd como el fallback de posicion compiten para avanzar;
  // el primero que llega gana, el segundo es no-op.
  const handledEndForIndexRef = useRef<number>(-1);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // --- WITH SWITCH GATE ---
  // Envuelve toda transicion (play/next/prev/skipTo/advance/...) con el
  // gate global. Garantiza que durante la transicion el listener no
  // observe estado stale y resetea los refs de logueo (listenTime y
  // lastLogged) para que el track entrante arranque contando desde 0
  // y se pueda loguear, incluso si tiene el mismo trackId que el saliente
  // (caso replay del mismo track desde otro contexto).
  //
  // Es seguro resetear lastLoggedTrackIdRef aca porque el listener de
  // onProgress bailea con `if (switchingRef.current) return`. Mientras
  // el gate esta activo, el listener no puede observar lastLogged === null
  // con queue stale y duplicar el log del track saliente. Cuando el gate
  // libera, el queue ya esta actualizado al nuevo track.
  const withSwitchGate = useCallback(async (fn: () => Promise<void>) => {
    if (switchingRef.current) return;
    switchingRef.current = true;
    listenTimeRef.current = null;
    lastLoggedTrackIdRef.current = null;
    handledEndForIndexRef.current = -1;
    try {
      await fn();
    } finally {
      switchingRef.current = false;
    }
  }, []);

  // --- ADVANCE FROM END ---
  // Centraliza la logica de avance automatico al terminar un track.
  // Se llama desde onTrackEnd (evento nativo) y desde el fallback de
  // posicion en onProgress. handledEndForIndexRef garantiza una sola
  // transicion aunque ambos disparen.
  const advanceFromEnd = useCallback(async () => {
    const { queue, queueIndex } = stateRef.current;
    if (handledEndForIndexRef.current === queueIndex) return;
    handledEndForIndexRef.current = queueIndex;

    // Nota: NO usamos withSwitchGate aca para no resetear
    // handledEndForIndexRef que acabamos de marcar. Manejamos
    // switchingRef manualmente y replicamos los demas resets.
    if (switchingRef.current) return;
    switchingRef.current = true;
    listenTimeRef.current = null;
    lastLoggedTrackIdRef.current = null;

    try {
      const ni = queueIndex + 1;

      if (ni < queue.length) {
        const skipped = await PlayerService.skipToPreloaded();
        if (skipped) {
          dispatch({ type: "SET_INDEX", index: ni });
          return;
        }
        const song = queue[ni];
        const url = await resolveUrl(String(song.id));
        await PlayerService.switchTrack(toTrackInput(song, url));
        dispatch({ type: "SET_INDEX", index: ni });
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
          return;
        }
      }

      await PlayerService.pause();
    } catch (err) {
      console.error("[advanceFromEnd] error:", err);
      handledEndForIndexRef.current = -1;
    } finally {
      switchingRef.current = false;
    }
  }, []);

  // PLAYBACK
  const playList = useCallback(
    (list: Song[], startIndex: number, source?: PlaySource) =>
      withSwitchGate(async () => {
        playedAutoplayIdsRef.current.clear();

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
        }
      }),
    [logPlayAlbum, logPlayArtist, invalidateRecent, withSwitchGate],
  );

  const playSingle = useCallback(
    (song: Song, source: PlaySource) =>
      withSwitchGate(async () => {
        playedAutoplayIdsRef.current.clear();

        try {
          const url = await resolveUrl(String(song.id));
          await PlayerService.playTrack(toTrackInput(song, url));
          dispatch({ type: "PLAY_SINGLE", song, source });
        } catch (err) {
          console.error("[playSingle] error:", err);
        }
      }),
    [withSwitchGate],
  );

  const next = useCallback(
    () =>
      withSwitchGate(async () => {
        const { queue, queueIndex } = stateRef.current;
        const ni = queueIndex + 1;

        if (ni < queue.length) {
          const song = queue[ni];
          const url = await resolveUrl(String(song.id));
          dispatch({ type: "SET_INDEX", index: ni });
          await PlayerService.switchTrack(toTrackInput(song, url));
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
            return;
          }
        }
      }),
    [withSwitchGate],
  );

  const prev = useCallback(
    () =>
      withSwitchGate(async () => {
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

        const url = await resolveUrl(String(song.id));
        await PlayerService.switchTrack(toTrackInput(song, url));
      }),
    [withSwitchGate],
  );

  const skipTo = useCallback(
    (index: number) =>
      withSwitchGate(async () => {
        const { queue } = stateRef.current;
        if (index < 0 || index >= queue.length) return;

        const song = queue[index];
        dispatch({ type: "SET_INDEX", index });

        const url = await resolveUrl(String(song.id));
        await PlayerService.switchTrack(toTrackInput(song, url));
      }),
    [withSwitchGate],
  );

  const addToQueueAndPlay = useCallback(
    (song: Song) =>
      withSwitchGate(async () => {
        const { queue } = stateRef.current;
        if (queue.some((s) => String(s.id) === String(song.id))) return;

        playedAutoplayIdsRef.current.add(String(song.id));
        dispatch({ type: "ADD_AUTOPLAY", song });

        const url = await resolveUrl(String(song.id));
        await PlayerService.switchTrack(toTrackInput(song, url));
      }),
    [withSwitchGate],
  );

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
        // Gate global: durante una transicion el queue puede estar
        // stale (apuntando al track viejo) y los timestamps reportados
        // pueden ser del track viejo o del nuevo arrancando. Bailear
        // evita: (a) duplicar logs del track viejo cuando se re-entra
        // a este callback antes del dispatch, (b) acumular tiempo
        // erroneo, (c) disparar advanceFromEnd con queue stale.
        if (switchingRef.current) return;

        const { queue, queueIndex } = stateRef.current;
        const track = queue[queueIndex];
        if (!track) return;

        const trackId = String(track.id);

        // acumular tiempo de escucha
        if (!listenTimeRef.current || listenTimeRef.current.trackId !== trackId) {
          listenTimeRef.current = { trackId, accumulated: 0, lastPosition: position };
          return;
        }

        // repeat detection: position salto para atras (loop). En este
        // caso si hace falta resetear lastLoggedTrackIdRef porque el
        // trackId no cambio pero queremos permitir relog.
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

        // log a los 30s
        if (listenTimeRef.current.accumulated >= 30 && lastLoggedTrackIdRef.current !== trackId) {
          lastLoggedTrackIdRef.current = trackId;
          const offline = await getOfflineTrack(trackId);

          const offlineArtists = offline
            ? (() => { try { return JSON.parse(offline.artists); } catch { return []; } })()
            : [];

          const metadata = offline
            ? {
              album_id: offline.album_id || undefined,
              album_name: offline.album || undefined,
              artists: offlineArtists,
              track_name: offline.title,
              duration_seconds: offline.duration_seconds,
              thumbnail_url: offline.thumbnail_url,
            }
            : {
              album_id: track.album_id ?? undefined,
              album_name: track.album_name,
              artists: Array.isArray(track.artists) ? track.artists : [],
              track_name: track.title,
              duration_seconds: track.duration_seconds,
              thumbnail_url: track.thumbnail,
            };

          logPlayTrack(trackId, metadata).catch(() => { });
        }

        // preload a 15s del final
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
        // advanceFromEnd() se encarga del dedup con onTrackEnd.
        if (duration > 0 && duration - position < 0.8) {
          advanceFromEnd();
        }
      },
    );

    const subEnded = PlayerService.onTrackEnd(() => {
      advanceFromEnd();
    });

    const subError = PlayerService.onError((err: unknown) => {
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
  }, [logPlayTrack, next, prev, advanceFromEnd]);

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
      isPlaying
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
      isPlaying
    ],
  );

  return (
    <MusicContext.Provider value={value}>{children}</MusicContext.Provider>
  );
}