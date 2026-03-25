import TrackPlayer, { Event } from 'react-native-track-player';

const DEBUG =
  (typeof process !== 'undefined' &&
    process.env?.EXPO_PUBLIC_DEBUG_PLAYER === '1') || false;

//DBG: {
//const DEBUG = true;
//DBG: }

const dlog = (...a: any[]) => { if (DEBUG) console.log(...a); };
const dwarn = (...a: any[]) => { if (DEBUG) console.warn(...a); };

export default async function playbackService() {
  // Controles remotos
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteSeek, e => TrackPlayer.seekTo(e.position));

  // iOS: RemoteNext/RemotePrevious deben vivir aquí (background thread).
  // MusicProvider no está vivo cuando la app está muerta — estos handlers
  // permiten que la lock screen funcione siempre. MusicProvider sincroniza
  // su estado al volver a foreground (AppState).
  TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext());
  TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious());

  // --- Repeat-One (repetir la pista actual) ---
  TrackPlayer.addEventListener(Event.PlaybackTrackEnded, async () => {
    try {
      const getRepeatMode = TrackPlayer && TrackPlayer.getRepeatMode;
      const mode = getRepeatMode ? await getRepeatMode() : undefined;

      const RM = (TrackPlayer && TrackPlayer.RepeatMode) || {};
      if (mode === RM.Track) {
        await TrackPlayer.seekTo(0);
        await TrackPlayer.play();
        return;
      }
    } catch (e) {
      // silencioso: si la API no existe, seguí el flujo normal
    }
  });

  // --- Manejo de errores de IO ---
  TrackPlayer.addEventListener(Event.PlaybackError, async (e) => {
    const errorCode = e?.code || '';
    const isIOError = errorCode === 'android-io-unspecified' ||
      errorCode === 'android-io-bad-http-status' ||
      errorCode.includes('io');

    if (isIOError) {
      try {
        const position = await TrackPlayer.getPosition();
        const duration = await TrackPlayer.getDuration();
        const buffered = await TrackPlayer.getBufferedPosition();

        const nearEndOfBuffer = buffered > 0 && position >= buffered - 2;
        const nearEndOfTrack = duration > 0 && position / duration > 0.92;

        if (nearEndOfBuffer || nearEndOfTrack) {
          console.log('[RNTP] Stream terminó antes de duración reportada, avanzando...');

          const queue = await TrackPlayer.getQueue();
          const currentIndex = await TrackPlayer.getActiveTrackIndex();

          if (currentIndex !== null && currentIndex < queue.length - 1) {
            await TrackPlayer.skipToNext();
            await TrackPlayer.play();
          } else {
            console.log('[RNTP] Última canción de la fila, emitiendo evento de fin');
          }
          return;
        }
      } catch (err) {
        console.warn('[RNTP] Error handling playback error:', err);
      }
    }

    console.warn('[RNTP][error]', errorCode, e?.message);
  });

  // --- Diagnóstico de primer play / latencia ---
  const t0 = Date.now();

  TrackPlayer.addEventListener(Event.PlaybackState, async ({ state }) => {
    if (!DEBUG) return;
    let pos = 0;
    try { pos = await TrackPlayer.getPosition(); } catch (e) { }
    dlog(`[RNTP][state] s=${state} t+${Date.now() - t0}ms pos=${pos.toFixed(2)}s`);
  });

  TrackPlayer.addEventListener(Event.PlaybackError, e => {
    if (!DEBUG) return;
    dwarn('[RNTP][error]', e && (e.code || e.message) ? e : String(e));
  });

  let lastLog = 0;
  TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, e => {
    if (!DEBUG) return;
    const now = Date.now();
    if (now - lastLog < 400) return;
    lastLog = now;
    const position = (e && e.position) || 0;
    const duration = (e && e.duration) || 0;
    const buffered = (e && e.buffered) || 0;
    dlog(
      `[RNTP][progress] t+${now - t0}ms pos=${position.toFixed(2)}s ` +
      `buf=${buffered.toFixed(2)}s dur=${duration.toFixed(2)}s`
    );
  });

  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async () => {
    if (!DEBUG) return;
    try {
      const getActiveTrack = TrackPlayer.getActiveTrack ? TrackPlayer.getActiveTrack.bind(TrackPlayer) : null;
      let track = null;
      if (getActiveTrack) track = await getActiveTrack();
      dlog('[RNTP][active]', track ? { id: track.id } : null, `t+${Date.now() - t0}ms`);
    } catch (e) { }
  });
}