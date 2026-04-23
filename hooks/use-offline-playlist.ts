import { removeOfflineTrack } from "@/lib/offlineItems";
import {
  getOfflinePlaylist,
  getTrackIdsForPlaylist,
  getTrackRefcount,
  removeOfflinePlaylist,
} from "@/lib/offlinePlaylists";
import {
  offlinePlaylistManager,
  OfflinePlaylistMeta,
  OfflinePlaylistState,
} from "@/services/offline-playlist-manager";
import { OfflineDownloadMeta, offlineService } from "@/services/offline-service";
import { useCallback, useEffect, useState } from "react";

export type { OfflinePlaylistMeta, OfflinePlaylistState };

const IDLE_STATE: OfflinePlaylistState = {
  status: "idle",
  completed: 0,
  failed: 0,
  total: 0,
  progress: 0,
};

export function useOfflinePlaylist(playlistId: string | null) {
  const [state, setState] = useState<OfflinePlaylistState>(() =>
    playlistId ? offlinePlaylistManager.getState(playlistId) : IDLE_STATE
  );

  useEffect(() => {
    if (!playlistId) return;

    // Suscribirse primero para no perder eventos durante la hidratacion.
    const unsubscribe = offlinePlaylistManager.subscribe(playlistId, setState);

    // Snapshot actual (por si ya hay un job activo o encolado).
    setState(offlinePlaylistManager.getState(playlistId));

    // Si no hay state en memoria, intentar rehidratar de DB.
    offlinePlaylistManager.hydrateFromDb(playlistId).then(() => {
      setState(offlinePlaylistManager.getState(playlistId));
    });

    return unsubscribe;
  }, [playlistId]);

  const download = useCallback(
    (meta: OfflinePlaylistMeta, tracks: OfflineDownloadMeta[]) => {
      offlinePlaylistManager.enqueue(meta, tracks);
    },
    []
  );

  const cancel = useCallback(() => {
    if (!playlistId) return;
    offlinePlaylistManager.cancel(playlistId);
  }, [playlistId]);

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
  }, []);

  return {
    state,
    download,
    cancel,
    remove,
  };
}