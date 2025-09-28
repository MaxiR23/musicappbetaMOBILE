import TrackPlayer, { Event } from 'react-native-track-player';

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
    let pos = 0;
    try { pos = await TrackPlayer.getPosition(); } catch (e) {}
    console.log(`[RNTP][state] s=${state} t+${Date.now() - t0}ms pos=${pos.toFixed(2)}s`);
  });

  TrackPlayer.addEventListener(Event.PlaybackError, e => {
    console.warn('[RNTP][error]', e && (e.code || e.message) ? e : String(e));
  });

  // Progreso / buffer (RNTP v3 expone position, duration, buffered)
  let lastLog = 0;
  TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, e => {
    const now = Date.now();
    if (now - lastLog < 400) return; // throttle
    lastLog = now;
    const position = (e && e.position) || 0;
    const duration = (e && e.duration) || 0;
    const buffered = (e && e.buffered) || 0;
    console.log(
      `[RNTP][progress] t+${now - t0}ms pos=${position.toFixed(2)}s ` +
      `buf=${buffered.toFixed(2)}s dur=${duration.toFixed(2)}s`
    );
  });

  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async () => {
    try {
      const getActiveTrack = TrackPlayer.getActiveTrack ? TrackPlayer.getActiveTrack.bind(TrackPlayer) : null;
      let track = null;
      if (getActiveTrack) track = await getActiveTrack();
      console.log('[RNTP][active]', track ? { id: track.id } : null, `t+${Date.now() - t0}ms`);
    } catch (e) {}
  });
}