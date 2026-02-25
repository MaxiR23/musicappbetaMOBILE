import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
} from 'react-native-track-player';

const g = globalThis;
g.__RNTP__ = g.__RNTP__ || { service: false, ready: false };

export async function ensureTrackPlayer() {
  if (!g.__RNTP__.service) {
    try {
      const service = require('./trackPlayerService').default;
      TrackPlayer.registerPlaybackService(() => service);
      g.__RNTP__.service = true;
    } catch (e) {
      console.warn('[RNTP] service registration failed', e);
    }
  }

  if (g.__RNTP__.ready) return;

  try {
    await TrackPlayer.setupPlayer({
      waitForBuffer: false,
      minBuffer: 2,
      maxBuffer: 12,
      playBuffer: 0.5,
      backBuffer: 0,
      maxCacheSize: 64 * 1024 * 1024, 

      bufferForPlaybackMs: 0,
      bufferForPlaybackAfterRebufferMs: 250,

      iosCategory: 'playback',
      iosCategoryMode: 'default',
      iosCategoryOptions: ['mixWithOthers'],
    });
  } catch (e) {
    console.log('[RNTP] setupPlayer options not supported, fallback:', e && e.message ? e.message : e);
    await TrackPlayer.setupPlayer();
  }

  await TrackPlayer.updateOptions({
    android: { appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback },
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
}