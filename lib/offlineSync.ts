import { removeOfflineTrack, upsertOfflineTrack, } from "@/lib/offlineItems";

import {
  getOfflinePlaylist,
  getTrackIdsForPlaylist,
  getTrackRefcount,
  linkTrackToPlaylist,
  removeOfflinePlaylist,
  unlinkTrackFromPlaylist,
} from "@/lib/offlinePlaylists";

import { OfflineDownloadMeta, offlineService } from "@/services/offline-service";
import { Song } from "@/types/music";

function songToOfflineMeta(song: Song): OfflineDownloadMeta {
  return {
    track_id: song.id,
    title: song.title,
    artist: song.artist_name ?? "",
    artist_id: song.artist_id ?? "",
    album: song.album_name ?? "",
    album_id: song.album_id ?? "",
    thumbnail_url: song.thumbnail ?? "",
    duration_seconds: song.duration_seconds ?? 0,
  };
}

/**
 * Si la playlist esta en offline con status "done",
 * sincroniza el track nuevo trayendolo al dispositivo
 * y vinculandolo a la playlist local.
 *
 * Silent: loguea warn y nunca propaga errores (fire-and-forget).
 * Idempotente: si el track ya esta linkeado, no hace nada.
 * Gate: si la playlist no esta en offline_playlists o no esta "done", retorna.
 */
export async function syncTrackToOfflinePlaylist(
  playlistId: string,
  song: Song,
): Promise<void> {
  try {
    const pl = await getOfflinePlaylist(playlistId);
    if (!pl || pl.status !== "done") return;

    const existingIds = await getTrackIdsForPlaylist(playlistId);
    if (existingIds.includes(song.id)) return;

    const meta = songToOfflineMeta(song);
    const position = existingIds.length;

    try {
      await offlineService.download(meta);
      await linkTrackToPlaylist(playlistId, meta.track_id, position, "ok");
    } catch (err) {
      console.warn(
        `[offlineSync] sync failed for ${meta.track_id} in ${playlistId}:`,
        err,
      );
      await upsertOfflineTrack({
        track_id: meta.track_id,
        title: meta.title,
        artist: meta.artist,
        artist_id: meta.artist_id,
        album: meta.album,
        album_id: meta.album_id,
        thumbnail_url: meta.thumbnail_url,
        duration_seconds: meta.duration_seconds,
        downloaded_at: new Date().toISOString(),
      });
      await linkTrackToPlaylist(playlistId, meta.track_id, position, "failed");
    }
  } catch (err) {
    console.warn("[offlineSync] syncTrackToOfflinePlaylist error:", err);
  }
}

/**
 * Si la playlist esta en offline y el track esta linkeado,
 * desvincula el track. Si nadie mas lo referencia (refcount 0),
 * borra el archivo local y la fila de offline_tracks.
 *
 * Silent: loguea warn y nunca propaga errores (fire-and-forget).
 * Idempotente: si la playlist no esta en offline o el track no esta linkeado,
 * no hace nada.
 */
export async function unsyncTrackFromOfflinePlaylist(
  playlistId: string,
  trackId: string,
): Promise<void> {
  try {
    const pl = await getOfflinePlaylist(playlistId);
    if (!pl) return;

    const existingIds = await getTrackIdsForPlaylist(playlistId);
    if (!existingIds.includes(trackId)) return;

    await unlinkTrackFromPlaylist(playlistId, trackId);

    const refcount = await getTrackRefcount(trackId);
    if (refcount === 0) {
      await offlineService.remove(trackId);
      await removeOfflineTrack(trackId);
    }
  } catch (err) {
    console.warn("[offlineSync] unsyncTrackFromOfflinePlaylist error:", err);
  }
}

/**
 * Si la playlist esta en offline, la remueve entera:
 * borra la fila de offline_playlists, desvincula todos sus tracks,
 * y borra los archivos locales que queden sin referencias.
 *
 * Silent: loguea warn y nunca propaga errores (fire-and-forget).
 * Idempotente: si la playlist no esta en offline, no hace nada.
 */
export async function purgeOfflinePlaylist(playlistId: string): Promise<void> {
  try {
    const row = await getOfflinePlaylist(playlistId);
    if (!row) return;

    const trackIds = await getTrackIdsForPlaylist(playlistId);

    await removeOfflinePlaylist(playlistId);

    for (const trackId of trackIds) {
      const refcount = await getTrackRefcount(trackId);
      if (refcount === 0) {
        await offlineService.remove(trackId);
        await removeOfflineTrack(trackId);
      }
    }
  } catch (err) {
    console.warn("[offlineSync] purgeOfflinePlaylist error:", err);
  }
}