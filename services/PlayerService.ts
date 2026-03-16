/**
 * PlayerService.ts
 * Unica interfaz con TrackPlayer.
 * TP maneja maximo 2 tracks: el actual + preloaded.
 * React (MusicProvider) es la fuente de verdad de la cola.
 */

import trackPlayerService from "./trackPlayerService";

import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  RepeatMode,
  State,
  TrackType,
} from "react-native-track-player";

const g = globalThis as any;
g.__tp_init__ = g.__tp_init__ || { ready: false, registered: false };

async function init(): Promise<void> {
  if (!g.__tp_init__.registered) {
    TrackPlayer.registerPlaybackService(() => trackPlayerService);
    g.__tp_init__.registered = true;
  }

  if (g.__tp_init__.ready) return;

  try {
    await TrackPlayer.setupPlayer({
      waitForBuffer: false,
      minBuffer: 2,
      maxBuffer: 12,
      playBuffer: 0.5,
      backBuffer: 0,
      maxCacheSize: 64 * 1024 * 1024,
    });
  } catch (e: any) {
    if (!e?.message?.includes("already been initialized")) {
      throw e;
    }
  }

  await TrackPlayer.updateOptions({
    android: {
      appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
    },
    capabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
      Capability.SeekTo,
    ],
    compactCapabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
    ],
    progressUpdateEventInterval: 0.3,
  });

  g.__tp_init__.ready = true;
}

export interface TrackInput {
  id: string;
  url?: string;
  title?: string;
  artist_name?: string;
  artist?: string;
  thumbnail?: string;
  thumbnail_url?: string;
  [key: string]: any;
}

/** Construye el objeto track que TP necesita a partir de la metadata de la Song */
function buildTrack(song: TrackInput) {
  return {
    id: String(song.id),
    url: song.url || "",
    title: song.title || "",
    artist: song.artist_name ?? song.artist ?? "",
    artwork: song.thumbnail ?? song.thumbnail_url ?? undefined,
    type: TrackType.Default,
    headers: {
      Range: "bytes=0-",
      "Accept-Encoding": "identity",
      Connection: "keep-alive",
    },
  };
}

let preloadedId: string | null = null;

/** Limpia todos los tracks de TP excepto el activo */
async function cleanupOldTracks(): Promise<void> {
  const q = await TrackPlayer.getQueue();
  if (q.length <= 1) return;

  const active = (await TrackPlayer.getActiveTrackIndex()) ?? 0;
  const toRemove = q
    .map((_, i) => i)
    .filter((i) => i !== active)
    .reverse();

  for (const i of toRemove) {
    await TrackPlayer.remove(i);
  }
}

/** Carga UN track y lo reproduce. Mata todo lo anterior. */
export async function playTrack(song: TrackInput): Promise<void> {
  await init();
  preloadedId = null;

  const track = buildTrack(song);
  await TrackPlayer.setQueue([track]);
  await TrackPlayer.play();
}

/** Cambia de track sin cortar el audio. Para next/prev/skipTo. */
export async function switchTrack(song: TrackInput): Promise<void> {
  await init();

  const track = buildTrack(song);
  await TrackPlayer.add(track);
  await TrackPlayer.skipToNext();
  preloadedId = null;

  await cleanupOldTracks();
}

/** Precarga el siguiente track en posicion 1 de TP. Si ya hay uno, lo reemplaza. */
export async function preloadNext(song: TrackInput): Promise<void> {
  await init();

  const nextId = String(song.id);
  if (preloadedId === nextId) return;

  await cleanupOldTracks();

  const track = buildTrack(song);
  await TrackPlayer.add(track);
  preloadedId = nextId;
}

/** Salta al track preloaded. Retorna true si habia preload. */
export async function skipToPreloaded(): Promise<boolean> {
  if (!preloadedId) return false;

  const queue = await TrackPlayer.getQueue();
  if (queue.length < 2) {
    preloadedId = null;
    return false;
  }

  await TrackPlayer.skipToNext();
  await cleanupOldTracks();

  preloadedId = null;
  return true;
}

export async function pause(): Promise<void> {
  await TrackPlayer.pause();
}

export async function resume(): Promise<void> {
  await TrackPlayer.play();
}

export async function seekTo(seconds: number): Promise<void> {
  await TrackPlayer.seekTo(seconds);
}

export async function getPosition(): Promise<number> {
  return TrackPlayer.getPosition();
}

export async function getPlaybackState(): Promise<State> {
  const ps = await TrackPlayer.getPlaybackState();
  return ps.state;
}

export async function setRepeatMode(mode: RepeatMode): Promise<void> {
  await TrackPlayer.setRepeatMode(mode);
}

export async function getRepeatMode(): Promise<RepeatMode> {
  return TrackPlayer.getRepeatMode();
}

/** Alterna play/pause. Retorna true si queda playing, false si paused. */
export async function togglePlayPause(): Promise<boolean> {
  const state = await getPlaybackState();
  if (state === State.Playing) {
    await TrackPlayer.pause();
    return false;
  }
  await TrackPlayer.play();
  return true;
}

export function onTrackEnd(cb: () => void) {
  return TrackPlayer.addEventListener(Event.PlaybackQueueEnded, cb);
}

export function onProgress(cb: (data: { position: number; duration: number }) => void) {
  return TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, cb as any);
}

export function onError(cb: (error: any) => void) {
  return TrackPlayer.addEventListener(Event.PlaybackError, cb);
}

export function onPlaybackState(cb: (state: State) => void) {
  return TrackPlayer.addEventListener(Event.PlaybackState, (e: any) => cb(e.state));
}

export function onRemoteNext(cb: () => void) {
  return TrackPlayer.addEventListener(Event.RemoteNext, cb);
}

export function onRemotePrev(cb: () => void) {
  return TrackPlayer.addEventListener(Event.RemotePrevious, cb);
}

export { RepeatMode, State };
