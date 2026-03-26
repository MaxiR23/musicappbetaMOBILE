import { getDb } from "@/lib/db";

export interface StreamCacheRow {
  video_id: string;
  url: string;
  mime_type: string;
  bitrate: number;
  expires_at: number;
}

// ── WRITE ─────────────────────────────────────────────────────────────────────

export async function upsertStream(row: StreamCacheRow): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO stream_cache (video_id, url, mime_type, bitrate, expires_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(video_id) DO UPDATE SET
      url = excluded.url,
      mime_type = excluded.mime_type,
      bitrate = excluded.bitrate,
      expires_at = excluded.expires_at`,
    row.video_id,
    row.url,
    row.mime_type,
    row.bitrate,
    row.expires_at
  );
}

// ── READ ──────────────────────────────────────────────────────────────────────

export async function getStream(videoId: string): Promise<StreamCacheRow | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<StreamCacheRow>(
    "SELECT * FROM stream_cache WHERE video_id = ? AND expires_at > ?",
    videoId,
    Date.now()
  );
  return row ?? null;
}

// ── CLEANUP ───────────────────────────────────────────────────────────────────

export async function deleteExpiredStreams(): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM stream_cache WHERE expires_at <= ?", Date.now());
}

export async function clearStreamCache(): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM stream_cache");
}