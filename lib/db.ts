import * as SQLite from "expo-sqlite";

const DB_NAME = "beatly.db";

let _db: SQLite.SQLiteDatabase | null = null;
let _migrated = false;

type Migration = {
  version: number;
  up: string;
};

const migrations: Migration[] = [
  {
    version: 1,
    up: `
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
    `,
  },
  {
    version: 2,
    up: `
      CREATE TABLE IF NOT EXISTS stream_cache (
        video_id TEXT PRIMARY KEY NOT NULL,
        url TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        bitrate INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      );
    `,
  },
  {
    version: 3,
    up: `
    CREATE TABLE IF NOT EXISTS offline_tracks (
      track_id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      artist_id TEXT NOT NULL,
      album TEXT NOT NULL DEFAULT '',
      album_id TEXT NOT NULL DEFAULT '',
      thumbnail_url TEXT NOT NULL DEFAULT '',
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      downloaded_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_offline_tracks_downloaded
      ON offline_tracks(downloaded_at DESC);
  `,
  },
];

function ensureDb(): SQLite.SQLiteDatabase {
  if (_db) return _db;
  _db = SQLite.openDatabaseSync(DB_NAME);
  return _db;
}

async function runMigrations(): Promise<SQLite.SQLiteDatabase> {
  const db = ensureDb();

  await db.execAsync("PRAGMA journal_mode = WAL;");

  const row = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  let currentVersion = row?.user_version ?? 0;

  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      await db.execAsync(migration.up);
      await db.execAsync(`PRAGMA user_version = ${migration.version};`);
      currentVersion = migration.version;
    }
  }

  _migrated = true;
  return db;
}

const _initPromise = runMigrations();

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_migrated) return _db!;
  return _initPromise;
}

export function waitForDb(): Promise<SQLite.SQLiteDatabase> {
  return _initPromise;
}