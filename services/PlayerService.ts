/**
 * PlayerService.ts
 * Servicio centralizado para react-native-track-player
 * 
 * REGLAS:
 * 1. TODA operacion de TrackPlayer pasa por aca
 * 2. NO llamar TrackPlayer directamente desde MusicProvider
 * 3. Metodos atomicos: cada uno hace UNA cosa bien
 */

import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  RepeatMode,
  State,
  TrackType,
} from 'react-native-track-player';

// Estado global del servicio
const g = globalThis as any;
g.__PlayerService__ = g.__PlayerService__ || {
  initialized: false,
  serviceRegistered: false,
};

export interface TrackData {
  id: string;
  title: string;
  artist_name?: string;
  artist?: string;
  thumbnail?: string;
  thumbnail_url?: string;
  // Otros campos que puedas necesitar
  [key: string]: any;
}

function buildTrack(song: TrackData, baseUrl: string) {
  return {
    id: String(song.id),
    url: (song as any).url || '', // TODO RESOLVE: `${baseUrl}/music/play?id=${encodeURIComponent(song.id)}&redir=2`
    title: song.title,
    artist: song.artist_name ?? song.artist ?? '',
    artwork: song.thumbnail ?? song.thumbnail_url ?? undefined,
    type: TrackType.Default,
    headers: {
      Range: 'bytes=0-',
      'Accept-Encoding': 'identity',
      Connection: 'keep-alive',
    },
  };
}

// Inicializa el player (idempotente)
export async function initPlayer(): Promise<void> {
  // Registrar servicio una sola vez
  if (!g.__PlayerService__.serviceRegistered) {
    try {
      const service = require('./trackPlayerService').default;
      TrackPlayer.registerPlaybackService(() => service);
      g.__PlayerService__.serviceRegistered = true;
    } catch (e) {
      console.warn('[PlayerService] service registration failed', e);
    }
  }

  if (g.__PlayerService__.initialized) return;

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
    // Si ya esta inicializado, no es error
    if (!e?.message?.includes('already been initialized')) {
      console.log('[PlayerService] setupPlayer fallback:', e?.message);
      try {
        await TrackPlayer.setupPlayer();
      } catch {
        // Ya inicializado
      }
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

  g.__PlayerService__.initialized = true;
}

/**
 * Carga una lista de canciones y reproduce desde un indice.
 * Metodo ATOMICO: reset + add + skip + play en secuencia optima.
 */
export async function loadQueueAndPlay(
  songs: TrackData[],
  startIndex: number,
  baseUrl: string
): Promise<void> {
  await initPlayer();

  if (!songs.length || !baseUrl) return;

  const idx = Math.max(0, Math.min(startIndex, songs.length - 1));
  const tracks = songs.map((s) => buildTrack(s, baseUrl));

  // Secuencia optima: reset -> add all -> skip -> play
  // Esto evita el problema de load() + manipular cola
  await TrackPlayer.reset();
  await TrackPlayer.add(tracks);

  if (idx > 0) {
    await TrackPlayer.skip(idx);
  }

  // play() inmediato despues de skip, sin await intermedio
  await TrackPlayer.play();
}

/**
 * Salta al indice especificado.
 * NO llama play() si ya esta reproduciendo.
 */
export async function skipTo(index: number): Promise<void> {
  await initPlayer();

  const queue = await TrackPlayer.getQueue();
  if (index < 0 || index >= queue.length) {
    console.warn('[PlayerService] skipTo: index out of range', index);
    return;
  }

  const state = await TrackPlayer.getPlaybackState();
  const wasPlaying = state.state === State.Playing;

  await TrackPlayer.skip(index);

  // Solo llamar play() si NO estaba reproduciendo
  // (skip() mantiene el estado de reproduccion)
  if (!wasPlaying) {
    await TrackPlayer.play();
  }
}

/**
 * Siguiente cancion.
 * Retorna true si avanzo, false si estaba en la ultima.
 */
export async function next(): Promise<boolean> {
  await initPlayer();

  const queue = await TrackPlayer.getQueue();
  const currentIndex = await TrackPlayer.getActiveTrackIndex();

  if (currentIndex === null || currentIndex >= queue.length - 1) {
    return false; // No hay siguiente
  }

  await TrackPlayer.skipToNext();
  return true;
}

/**
 * Cancion anterior o reinicia si position > 3s.
 */
export async function prev(): Promise<void> {
  await initPlayer();

  const position = await TrackPlayer.getPosition();

  if (position > 3) {
    await TrackPlayer.seekTo(0);
    return;
  }

  const currentIndex = await TrackPlayer.getActiveTrackIndex();
  if (currentIndex === null || currentIndex <= 0) {
    await TrackPlayer.seekTo(0);
    return;
  }

  await TrackPlayer.skipToPrevious();
}

/**
 * Agrega una cancion al final de la cola.
 * Retorna el indice donde se agrego.
 */
export async function appendTrack(
  song: TrackData,
  baseUrl: string
): Promise<number> {
  await initPlayer();

  const track = buildTrack(song, baseUrl);
  const queue = await TrackPlayer.getQueue();
  const insertIndex = queue.length;

  await TrackPlayer.add(track);
  return insertIndex;
}

/**
 * Agrega una cancion y salta a ella inmediatamente.
 */
export async function appendAndPlay(
  song: TrackData,
  baseUrl: string
): Promise<void> {
  const insertIndex = await appendTrack(song, baseUrl);
  await skipTo(insertIndex);
}

/**
 * Reordena la cola manteniendo la cancion actual.
 * Usado para shuffle on/off.
 */
export async function reorderQueue(
  newOrder: TrackData[],
  currentSongId: string,
  baseUrl: string
): Promise<number> {
  await initPlayer();

  // Encontrar el nuevo indice de la cancion actual
  const newIndex = newOrder.findIndex((s) => String(s.id) === currentSongId);
  if (newIndex === -1) {
    console.warn('[PlayerService] reorderQueue: current song not found');
    return -1;
  }

  // Obtener posicion actual para no perder el progreso
  const position = await TrackPlayer.getPosition();
  const state = await TrackPlayer.getPlaybackState();
  const wasPlaying = state.state === State.Playing;

  // Rebuild completo de la cola
  const tracks = newOrder.map((s) => buildTrack(s, baseUrl));

  await TrackPlayer.reset();
  await TrackPlayer.add(tracks);
  await TrackPlayer.skip(newIndex);
  await TrackPlayer.seekTo(position);

  if (wasPlaying) {
    await TrackPlayer.play();
  }

  return newIndex;
}

/**
 * Pausa en el final de la cola (para cuando no hay autoplay).
 */
export async function pauseAtEnd(): Promise<void> {
  await initPlayer();

  const queue = await TrackPlayer.getQueue();
  if (!queue.length) return;

  const lastIndex = queue.length - 1;

  await TrackPlayer.setRepeatMode(RepeatMode.Off);
  await TrackPlayer.skip(lastIndex);
  await TrackPlayer.pause();
  await TrackPlayer.seekTo(0);
}

// Re-exportar para conveniencia
export { RepeatMode, State, TrackPlayer };
