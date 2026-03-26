import * as SQLite from "expo-sqlite";

const DB_NAME = "beatly_likes.db";
const DB_VERSION = 1;

let _db: SQLite.SQLiteDatabase | null = null;
let _migrated = false;

export interface LikedTrackRow {
  track_id: string;
  title: string;
  artist: string;
  artist_id: string;
  album: string;
  album_id: string;
  thumbnail_url: string;
  duration_seconds: number;
  created_at: string;
  updated_at: string;
}

// ── INIT ──────────────────────────────────────────────────────────────────────
function ensureDb(): SQLite.SQLiteDatabase {
  if (_db) return _db;
  _db = SQLite.openDatabaseSync(DB_NAME);
  return _db;
}

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  const db = ensureDb();
  if (_migrated) return db;

  const row = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version"
  );
  const currentVersion = row?.user_version ?? 0;

  if (currentVersion < DB_VERSION) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS liked_tracks (
        track_id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        artist_id TEXT NOT NULL,
        album TEXT NOT NULL DEFAULT '',
        album_id TEXT NOT NULL DEFAULT '',
        thumbnail_url TEXT NOT NULL DEFAULT '',
        duration_seconds INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_liked_tracks_created
        ON liked_tracks(created_at DESC);
      PRAGMA user_version = ${DB_VERSION};
    `);
  }

  _migrated = true;
  return db;
}

// ── WRITE ─────────────────────────────────────────────────────────────────────
export async function upsertLike(track: LikedTrackRow): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO liked_tracks
      (track_id, title, artist, artist_id, album, album_id, thumbnail_url, duration_seconds, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(track_id) DO UPDATE SET
      title = excluded.title,
      artist = excluded.artist,
      artist_id = excluded.artist_id,
      album = excluded.album,
      album_id = excluded.album_id,
      thumbnail_url = excluded.thumbnail_url,
      duration_seconds = excluded.duration_seconds,
      updated_at = excluded.updated_at`,
    track.track_id,
    track.title,
    track.artist,
    track.artist_id,
    track.album,
    track.album_id,
    track.thumbnail_url,
    track.duration_seconds,
    track.created_at,
    track.updated_at
  );
}

export async function removeLike(trackId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM liked_tracks WHERE track_id = ?", trackId);
}

// ── READ ──────────────────────────────────────────────────────────────────────
export async function getAllLikes(): Promise<LikedTrackRow[]> {
  const db = await getDb();
  return db.getAllAsync<LikedTrackRow>(
    "SELECT * FROM liked_tracks ORDER BY created_at DESC"
  );
}

export async function getLikedTrackIds(): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ track_id: string }>(
    "SELECT track_id FROM liked_tracks"
  );
  return new Set(rows.map((r) => r.track_id));
}

export async function isLiked(trackId: string): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ track_id: string }>(
    "SELECT track_id FROM liked_tracks WHERE track_id = ?",
    trackId
  );
  return row !== null;
}

// ── SYNC HELPERS ──────────────────────────────────────────────────────────────
export async function getLastSyncTimestamp(): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ updated_at: string }>(
    "SELECT updated_at FROM liked_tracks ORDER BY updated_at DESC LIMIT 1"
  );
  return row?.updated_at ?? null;
}

export async function replaceAllLikes(tracks: LikedTrackRow[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM liked_tracks");
    for (const track of tracks) {
      await upsertLike(track);
    }
  });
}

export function getLikedTrackIdsSync(): Set<string> {
  try {
    const db = ensureDb();
    const rows = db.getAllSync<{ track_id: string }>(
      "SELECT track_id FROM liked_tracks"
    );
    return new Set(rows.map((r) => r.track_id));
  } catch {
    return new Set();
  }
}

// ── RESET ─────────────────────────────────────────────────────────────────────
export async function clearLikesDb(): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM liked_tracks");
} 