/**
 * INFO — Playback debug togglable por env
 *
 * Cómo activarlo mañana:
 * - Expo (dev): iniciar con `EXPO_PUBLIC_DEBUG_PLAYER=1 expo start`
 * - Expo (EAS build/dev client): agregar en app.json/app.config:
 *     {
 *       "expo": {
 *         "extra": { "EXPO_PUBLIC_DEBUG_PLAYER": "1" }
 *       }
 *     }
 * - .env: agregar `EXPO_PUBLIC_DEBUG_PLAYER=1` y reiniciar el bundler
 * - Bare RN: configurar variable de entorno antes de ejecutar Metro
 *
 * Cuando EXPO_PUBLIC_DEBUG_PLAYER ≠ "1", no loguea nada (comentarios quedan).
 */

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

  // --- Repeat-One (repetir la pista actual) ---
  // Si el modo de repetición es "Track", cuando termina la canción:
  // 1) volvemos al segundo 0
  // 2) reproducimos de nuevo
  // 3) cortamos el flujo para NO avanzar al siguiente tema
  TrackPlayer.addEventListener(Event.PlaybackTrackEnded, async () => {
    try {
      const getRepeatMode = TrackPlayer && TrackPlayer.getRepeatMode;
      const mode = getRepeatMode ? await getRepeatMode() : undefined;

      const RM = (TrackPlayer && TrackPlayer.RepeatMode) || {}; // fallback
      if (mode === RM.Track) {
        await TrackPlayer.seekTo(0);
        await TrackPlayer.play();
        return; // no avances al siguiente tema en repeat-one
      }
    } catch (e) {
      // silencioso: si la API no existe, seguí el flujo normal
    }
    // si NO está en repeat-one, dejá que otros handlers manejen el avance
  });

  // --- Manejo de errores de IO (streams que terminan antes de duración reportada) ---
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

        // Si estamos cerca del final del buffer o de la duración reportada
        const nearEndOfBuffer = buffered > 0 && position >= buffered - 2;
        const nearEndOfTrack = duration > 0 && position / duration > 0.92;

        if (nearEndOfBuffer || nearEndOfTrack) {
          console.log('[RNTP] Stream terminó antes de duración reportada, avanzando...');

          // Verificar si hay más tracks en la cola
          const queue = await TrackPlayer.getQueue();
          const currentIndex = await TrackPlayer.getActiveTrackIndex();

          if (currentIndex !== null && currentIndex < queue.length - 1) {
            await TrackPlayer.skipToNext();
            await TrackPlayer.play();
          } else {
            // Última canción - dejar que MusicProvider maneje autoplay
            console.log('[RNTP] Última canción de la cola, emitiendo evento de fin');
          }
          return;
        }
      } catch (err) {
        console.warn('[RNTP] Error handling playback error:', err);
      }
    }

    // Log otros errores
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

  // Progreso / buffer (RNTP v3 expone position, duration, buffered)
  let lastLog = 0;
  TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, e => {
    if (!DEBUG) return;
    const now = Date.now();
    if (now - lastLog < 400) return; // throttle
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