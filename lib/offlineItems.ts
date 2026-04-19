import { getDb } from "@/lib/db";

export interface OfflineTrackRow {
  track_id: string;
  title: string;
  artist: string;
  artist_id: string;
  album: string;
  album_id: string;
  thumbnail_url: string;
  duration_seconds: number;
  downloaded_at: string;
}

// WRITE
export async function upsertOfflineTrack(track: OfflineTrackRow): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO offline_tracks
      (track_id, title, artist, artist_id, album, album_id, thumbnail_url, duration_seconds, downloaded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(track_id) DO UPDATE SET
      title = excluded.title,
      artist = excluded.artist,
      artist_id = excluded.artist_id,
      album = excluded.album,
      album_id = excluded.album_id,
      thumbnail_url = excluded.thumbnail_url,
      duration_seconds = excluded.duration_seconds,
      downloaded_at = excluded.downloaded_at`,
    track.track_id,
    track.title,
    track.artist,
    track.artist_id,
    track.album,
    track.album_id,
    track.thumbnail_url,
    track.duration_seconds,
    track.downloaded_at
  );
}

export async function removeOfflineTrack(trackId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM offline_tracks WHERE track_id = ?", trackId);
}

// READ
export async function getAllOfflineTracks(): Promise<OfflineTrackRow[]> {
  const db = await getDb();
  return db.getAllAsync<OfflineTrackRow>(
    "SELECT * FROM offline_tracks ORDER BY downloaded_at DESC"
  );
}

export async function getOfflineTrack(trackId: string): Promise<OfflineTrackRow | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<OfflineTrackRow>(
    "SELECT * FROM offline_tracks WHERE track_id = ?",
    trackId
  );
  return row ?? null;
}

export async function getOfflineTrackIds(): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ track_id: string }>(
    "SELECT track_id FROM offline_tracks"
  );
  return new Set(rows.map((r) => r.track_id));
}

// RESET
export async function clearOfflineTracksDb(): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM offline_tracks");
}