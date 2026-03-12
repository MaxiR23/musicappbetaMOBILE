import TrackPlayer, { TrackType } from 'react-native-track-player';
import { ensureTrackPlayer } from './setupTrackPlayer';

export async function syncWithTrackPlayer(
  list: any[],
  startIndex: number,
  baseUrl: string,
  syncingRef: { current: boolean }
) {
  await ensureTrackPlayer();

  if (!baseUrl || !list?.length) return;

  const idx = Math.max(0, Math.min(startIndex, list.length - 1));

  // Construir todos los tracks
  const tracks = list.map((s) => ({
    id: String(s.id),
    url: `${baseUrl}/music/play?id=${encodeURIComponent(s.id)}&redir=2`,
    title: (s as any).title,
    artist: (s as any).artist_name ?? (s as any).artist ?? "",
    artwork: (s as any).thumbnail ?? (s as any).thumbnail_url ?? undefined,
    type: TrackType.Default,
    headers: {
      Range: "bytes=0-",
      "Accept-Encoding": "identity",
      Connection: "keep-alive",
    },
  }));

  syncingRef.current = true;
  try {
    await TrackPlayer.setQueue(tracks);
    
    if (idx > 0) {
      await TrackPlayer.skip(idx);
    }
  
    await TrackPlayer.play();

  } catch (e) {
    console.error("[sync] ERROR:", e);
    throw e;
  } finally {
    syncingRef.current = false;
  }
}