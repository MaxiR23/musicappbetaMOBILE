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

const dlog = (...a: any[]) => { if (DEBUG) console.log(...a); };
const dwarn = (...a: any[]) => { if (DEBUG) console.warn(...a); };

export default async function playbackService() {
  // Controles remotos
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext());
  TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious());
  TrackPlayer.addEventListener(Event.RemoteSeek, e => TrackPlayer.seekTo(e.position));

  // --- Diagnóstico de primer play / latencia ---
  const t0 = Date.now();

  TrackPlayer.addEventListener(Event.PlaybackState, async ({ state }) => {
    if (!DEBUG) return;
    let pos = 0;
    try { pos = await TrackPlayer.getPosition(); } catch (e) {}
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
    } catch (e) {}
  });
}