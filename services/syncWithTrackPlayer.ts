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

  const currentTrack = {
    id: String(list[idx].id),
    url: `${baseUrl}/music/play?id=${encodeURIComponent(list[idx].id)}&redir=2`,
    title: (list[idx] as any).title,
    artist: (list[idx] as any).artist_name ?? (list[idx] as any).artist ?? "",
    artwork: (list[idx] as any).thumbnail ?? (list[idx] as any).thumbnail_url ?? undefined,
    type: TrackType.Default,
    headers: {
      Range: "bytes=0-",
      "Accept-Encoding": "identity",
      Connection: "keep-alive",
    },
  } as any;

  syncingRef.current = true;
  try {
    await TrackPlayer.load(currentTrack);

    // Limpiar TODOS los tracks viejos (no solo upcoming)
    const oldQueue = await TrackPlayer.getQueue();
    for (let i = oldQueue.length - 1; i >= 0; i--) {
      if (oldQueue[i].id !== currentTrack.id) {
        await TrackPlayer.remove(i);
      }
    }

    const beforeTracks = list.slice(0, idx).map((s) => ({
      id: String(s.id),
      url: `${baseUrl}/music/play?id=${encodeURIComponent(s.id)}&redir=2`,
      title: (s as any).title,
      artist: (s as any).artist_name ?? (s as any).artist ?? "",
      artwork: (s as any).thumbnail ?? (s as any).thumbnail_url ?? undefined,
      type: TrackType.Default,
      headers: { Range: "bytes=0-", "Accept-Encoding": "identity", Connection: "keep-alive" },
    })) as any[];

    const afterTracks = list.slice(idx + 1).map((s) => ({
      id: String(s.id),
      url: `${baseUrl}/music/play?id=${encodeURIComponent(s.id)}&redir=2`,
      title: (s as any).title,
      artist: (s as any).artist_name ?? (s as any).artist ?? "",
      artwork: (s as any).thumbnail ?? (s as any).thumbnail_url ?? undefined,
      type: TrackType.Default,
      headers: { Range: "bytes=0-", "Accept-Encoding": "identity", Connection: "keep-alive" },
    })) as any[];

    if (beforeTracks.length > 0) await TrackPlayer.add(beforeTracks, 0);
    if (afterTracks.length > 0) await TrackPlayer.add(afterTracks);

    TrackPlayer.play().catch(() => {});

  } catch (e) {
    console.error("[sync] ERROR:", e);
    throw e;
  } finally {
    syncingRef.current = false;
  }
}