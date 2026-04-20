import { removeOfflineTrack, upsertOfflineTrack } from "@/lib/offlineItems";
import {
    getFailedTrackIdsForPlaylist,
    getOfflinePlaylist,
    getOkTrackIdsForPlaylist,
    getTrackIdsForPlaylist,
    getTrackRefcount,
    linkTrackToPlaylist,
    OfflinePlaylistKind,
    removeOfflinePlaylist,
    setOfflinePlaylistStatus,
    upsertOfflinePlaylist,
} from "@/lib/offlinePlaylists";
import { OfflineDownloadMeta, offlineService } from "@/services/offline-service";
import { useCallback, useEffect, useRef, useState } from "react";

const CONCURRENCY = 2;

export interface OfflinePlaylistMeta {
  playlist_id: string;
  kind: OfflinePlaylistKind;
  name: string;
  thumbnail_url: string;
}

export interface PlaylistDownloadState {
  status: "idle" | "downloading" | "done" | "error";
  completed: number;
  failed: number;
  total: number;
  progress: number;
}

const INITIAL_STATE: PlaylistDownloadState = {
  status: "idle",
  completed: 0,
  failed: 0,
  total: 0,
  progress: 0,
};

export function useOfflinePlaylist(playlistId: string | null) {
  const [state, setState] = useState<PlaylistDownloadState>(INITIAL_STATE);
  const cancelRef = useRef(false);

  // Al montar: leer estado actual de la DB
  useEffect(() => {
    if (!playlistId) return;
    let mounted = true;
    (async () => {
      const row = await getOfflinePlaylist(playlistId);
      if (!mounted) return;
      if (row && row.status === "done") {
        const failedIds = await getFailedTrackIdsForPlaylist(playlistId);
        const okIds = await getOkTrackIdsForPlaylist(playlistId);
        setState({
          status: "done",
          completed: okIds.length,
          failed: failedIds.length,
          total: okIds.length + failedIds.length,
          progress: 1,
        });
      }
    })();
    return () => { mounted = false; };
  }, [playlistId]);

  const download = useCallback(
    async (
      meta: OfflinePlaylistMeta,
      tracks: OfflineDownloadMeta[]
    ): Promise<void> => {
      if (!tracks.length) return;

      cancelRef.current = false;

      const nowIso = new Date().toISOString();
      await upsertOfflinePlaylist({
        playlist_id: meta.playlist_id,
        kind: meta.kind,
        status: "pending",
        name: meta.name,
        thumbnail_url: meta.thumbnail_url,
        downloaded_at: nowIso,
        updated_at: nowIso,
      });

      setState({
        status: "downloading",
        completed: 0,
        failed: 0,
        total: tracks.length,
        progress: 0,
      });

      let completedCount = 0;
      let failedCount = 0;

      const queue = tracks.map((t, idx) => ({ track: t, position: idx }));
      let cursor = 0;

      const worker = async () => {
        while (!cancelRef.current) {
          const next = cursor < queue.length ? queue[cursor++] : null;
          if (!next) break;

          try {
            await offlineService.download(next.track);
            await linkTrackToPlaylist(
              meta.playlist_id,
              next.track.track_id,
              next.position,
              "ok"
            );
            completedCount++;
          } catch (err) {
            console.warn(
              `[useOfflinePlaylist] Track ${next.track.track_id} failed:`,
              err
            );
            // Stub: insertar en offline_tracks para respetar la FK
            await upsertOfflineTrack({
              track_id: next.track.track_id,
              title: next.track.title,
              artist: next.track.artist,
              artist_id: next.track.artist_id,
              album: next.track.album,
              album_id: next.track.album_id,
              thumbnail_url: next.track.thumbnail_url,
              duration_seconds: next.track.duration_seconds,
              downloaded_at: new Date().toISOString(),
            });
            await linkTrackToPlaylist(
              meta.playlist_id,
              next.track.track_id,
              next.position,
              "failed"
            );
            failedCount++;
          }

          setState((s) => ({
            ...s,
            completed: completedCount,
            failed: failedCount,
            progress: (completedCount + failedCount) / tracks.length,
          }));
        }
      };

      const workers = Array.from({ length: CONCURRENCY }, () => worker());
      await Promise.all(workers);

      if (cancelRef.current) {
        setState(INITIAL_STATE);
        return;
      }

      await setOfflinePlaylistStatus(meta.playlist_id, "done");
      setState((s) => ({ ...s, status: "done", progress: 1 }));
    },
    []
  );

  const cancel = useCallback(() => {
    cancelRef.current = true;
  }, []);

  const remove = useCallback(async (id: string): Promise<void> => {
    const row = await getOfflinePlaylist(id);
    if (!row) return;

    const trackIds = await getTrackIdsForPlaylist(id);

    await removeOfflinePlaylist(id);

    for (const trackId of trackIds) {
      const refcount = await getTrackRefcount(trackId);
      if (refcount === 0) {
        await offlineService.remove(trackId);
        await removeOfflineTrack(trackId);
      }
    }

    setState(INITIAL_STATE);
  }, []);

  return {
    state,
    download,
    cancel,
    remove,
  };
}