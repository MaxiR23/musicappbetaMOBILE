import { getDb } from "@/lib/db";

export type OfflinePlaylistKind = "user" | "liked" | "genre";
export type OfflinePlaylistStatus = "pending" | "done";
export type OfflineTrackStatus = "ok" | "failed";

export interface OfflinePlaylistRow {
  playlist_id: string;
  kind: OfflinePlaylistKind;
  status: OfflinePlaylistStatus;
  name: string;
  thumbnail_url: string;
  downloaded_at: string;
  updated_at: string;
}

export interface OfflinePlaylistTrackRow {
  playlist_id: string;
  track_id: string;
  position: number;
  status: OfflineTrackStatus;
  added_at: string;
}

// WRITE - playlists
export async function upsertOfflinePlaylist(
  playlist: OfflinePlaylistRow
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO offline_playlists
      (playlist_id, kind, status, name, thumbnail_url, downloaded_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(playlist_id) DO UPDATE SET
      kind = excluded.kind,
      status = excluded.status,
      name = excluded.name,
      thumbnail_url = excluded.thumbnail_url,
      updated_at = excluded.updated_at`,
    playlist.playlist_id,
    playlist.kind,
    playlist.status,
    playlist.name,
    playlist.thumbnail_url,
    playlist.downloaded_at,
    playlist.updated_at
  );
}

export async function removeOfflinePlaylist(playlistId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "DELETE FROM offline_playlists WHERE playlist_id = ?",
    playlistId
  );
}

export async function setOfflinePlaylistStatus(
  playlistId: string,
  status: OfflinePlaylistStatus
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE offline_playlists SET status = ?, updated_at = ? WHERE playlist_id = ?",
    status,
    new Date().toISOString(),
    playlistId
  );
}

// WRITE - playlist_tracks
export async function linkTrackToPlaylist(
  playlistId: string,
  trackId: string,
  position: number,
  status: OfflineTrackStatus = "ok"
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO offline_playlist_tracks
      (playlist_id, track_id, position, status, added_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(playlist_id, track_id) DO UPDATE SET
      position = excluded.position,
      status = excluded.status`,
    playlistId,
    trackId,
    position,
    status,
    new Date().toISOString()
  );
}

export async function setTrackStatusInPlaylist(
  playlistId: string,
  trackId: string,
  status: OfflineTrackStatus
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE offline_playlist_tracks SET status = ? WHERE playlist_id = ? AND track_id = ?",
    status,
    playlistId,
    trackId
  );
}

export async function unlinkTrackFromPlaylist(
  playlistId: string,
  trackId: string
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "DELETE FROM offline_playlist_tracks WHERE playlist_id = ? AND track_id = ?",
    playlistId,
    trackId
  );
}

// READ - playlists
export async function getAllOfflinePlaylists(): Promise<OfflinePlaylistRow[]> {
  const db = await getDb();
  return db.getAllAsync<OfflinePlaylistRow>(
    "SELECT * FROM offline_playlists ORDER BY downloaded_at DESC"
  );
}

export async function getOfflinePlaylist(
  playlistId: string
): Promise<OfflinePlaylistRow | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<OfflinePlaylistRow>(
    "SELECT * FROM offline_playlists WHERE playlist_id = ?",
    playlistId
  );
  return row ?? null;
}

export async function getOfflinePlaylistIds(): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ playlist_id: string }>(
    "SELECT playlist_id FROM offline_playlists"
  );
  return new Set(rows.map((r) => r.playlist_id));
}

// READ - playlist_tracks
export async function getTrackIdsForPlaylist(
  playlistId: string
): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ track_id: string }>(
    "SELECT track_id FROM offline_playlist_tracks WHERE playlist_id = ? ORDER BY position ASC",
    playlistId
  );
  return rows.map((r) => r.track_id);
}

export async function getOkTrackIdsForPlaylist(
  playlistId: string
): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ track_id: string }>(
    "SELECT track_id FROM offline_playlist_tracks WHERE playlist_id = ? AND status = 'ok' ORDER BY position ASC",
    playlistId
  );
  return rows.map((r) => r.track_id);
}

export async function getFailedTrackIdsForPlaylist(
  playlistId: string
): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ track_id: string }>(
    "SELECT track_id FROM offline_playlist_tracks WHERE playlist_id = ? AND status = 'failed' ORDER BY position ASC",
    playlistId
  );
  return rows.map((r) => r.track_id);
}

// REFCOUNT
export async function getTrackRefcount(trackId: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM offline_playlist_tracks WHERE track_id = ?",
    trackId
  );
  return row?.count ?? 0;
}

// RESET
export async function clearOfflinePlaylistsDb(): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM offline_playlist_tracks");
  await db.runAsync("DELETE FROM offline_playlists");
}