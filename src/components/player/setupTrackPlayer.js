import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
} from 'react-native-track-player';

// Flags globales que sobreviven al Fast Refresh
const g = globalThis;
g.__RNTP__ = g.__RNTP__ || { service: false, ready: false };

export async function ensureTrackPlayer() {
  // Registrar el servicio una sola vez (RNTP v4 NO necesita registerHeadlessTask)
  if (!g.__RNTP__.service) {
    try {
      const service = require('../../services/trackPlayerService').default;
      console.log('[RNTP] registering playbackService…');
      TrackPlayer.registerPlaybackService(() => service);
      g.__RNTP__.service = true;
      console.log('[RNTP] playbackService registered');
    } catch (e) {
      console.warn('[RNTP] service registration failed', e);
    }
  }

  // Setup del player solo una vez
  if (g.__RNTP__.ready) return;

  console.log('[RNTP] setupPlayer…');
  await TrackPlayer.setupPlayer();

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
    compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext],
    progressUpdateEventInterval: 1,
  });

  g.__RNTP__.ready = true;
  console.log('[RNTP] setup complete');
}