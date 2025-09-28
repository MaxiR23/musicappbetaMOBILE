import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
} from 'react-native-track-player';

// Flags globales que sobreviven al Fast Refresh
const g = globalThis;
g.__RNTP__ = g.__RNTP__ || { service: false, ready: false };

export async function ensureTrackPlayer() {
  // Registrar el service UNA sola vez
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

  // Setup del player sólo una vez
  if (g.__RNTP__.ready) return;

  console.log('[RNTP] setupPlayer…');

  // ⚡ Intento con opciones agresivas para “fast start”.
  // Si tu RNTP no soporta opciones, hacemos fallback sin romper.
  try {
    await TrackPlayer.setupPlayer({
      waitForBuffer: false,
      android: {
        minBuffer: 5000,
        maxBuffer: 15000,
        playBuffer: 500,
        backBuffer: 0,
        maxCacheSize: 64 * 1024 * 1024,
      },
      iosCategory: 'playback',
      iosCategoryMode: 'default',
      iosCategoryOptions: ['mixWithOthers'],
    });
  } catch (e) {
    console.log('[RNTP] setupPlayer options not supported, falling back:', e?.message || e);
    await TrackPlayer.setupPlayer();
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
    compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext],
    progressUpdateEventInterval: 0.3,
  });

  g.__RNTP__.ready = true;
  console.log('[RNTP] setup complete');
}