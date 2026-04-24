import { API_URL } from "@/constants/config";
import {
  getAllLikes,
  getLastSyncTimestamp,
  LikedTrackRow,
  removeLike,
  replaceAllLikes,
  upsertLike,
} from "@/lib/likesDb";
import { supabase } from "@/lib/supabase";
import { cacheClearPrefix } from "@/utils/cache";
import { emitLikesChange } from "@/utils/likes-events";

// ── AUTH FETCH (mismo patron que musicService) ────────────────────────────────

async function authFetch<T = any>(url: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`);
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return (await res.json()) as T;
  return undefined as T;
}

// ── TYPES ─────────────────────────────────────────────────────────────────────
export interface LikePayload {
  track_id: string;
  title: string;
  artists: { id: string | null; name: string }[];
  album: string;
  album_id: string;
  thumbnail_url: string;
  duration_seconds: number;
}
interface BackendLikeRow {
  track_id: string;
  created_at: string;
  updated_at?: string;
  deleted_at: string | null;
  tracks: {
    track_id: string;
    title: string;
    artists: { id: string | null; name: string }[];
    album: string;
    album_id: string;
    thumbnail_url: string;
    duration_seconds: number;
  };
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function toLocalRow(row: BackendLikeRow): LikedTrackRow {
  return {
    track_id: row.track_id,
    title: row.tracks.title ?? "",
    artists: JSON.stringify(row.tracks.artists ?? []),
    album: row.tracks.album ?? "",
    album_id: row.tracks.album_id ?? "",
    thumbnail_url: row.tracks.thumbnail_url ?? "",
    duration_seconds: row.tracks.duration_seconds ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
  };
}

// ── API ───────────────────────────────────────────────────────────────────────
export const likesService = {
  like: async (payload: LikePayload): Promise<void> => {
    const now = new Date().toISOString();

    await upsertLike({
      track_id: payload.track_id,
      title: payload.title,
      artists: JSON.stringify(payload.artists),
      album: payload.album,
      album_id: payload.album_id,
      thumbnail_url: payload.thumbnail_url,
      duration_seconds: payload.duration_seconds,
      created_at: now,
      updated_at: now,
    });

    await authFetch(`${API_URL}/likes/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    await cacheClearPrefix("playlist:liked");
    await cacheClearPrefix("library-view");

    emitLikesChange();
  },

  unlike: async (trackId: string): Promise<void> => {
    // 1. Delete local (instantaneo)
    await removeLike(trackId);

    // 2. Push al backend (background)
    await authFetch(`${API_URL}/likes/${encodeURIComponent(trackId)}`, {
      method: "DELETE",
    });

    await cacheClearPrefix("playlist:liked");
    await cacheClearPrefix("library-view");

    emitLikesChange();
  },

  fetchAll: async (): Promise<LikedTrackRow[]> => {
    const rows: BackendLikeRow[] = await authFetch(`${API_URL}/likes/`);
    return (rows || []).map(toLocalRow);
  },

  /**
   * Sync completo: primera vez o cuando no hay timestamp local.
   * Baja todos los likes del backend y reemplaza SQLite.
   */
  fullSync: async (): Promise<LikedTrackRow[]> => {
    const rows = await likesService.fetchAll();
    await replaceAllLikes(rows);
    return rows;
  },

  /**
   * Delta sync: solo cambios desde el ultimo sync.
   * Aplica upserts y deletes en SQLite segun deleted_at.
   */
  deltaSync: async (): Promise<void> => {
    const since = await getLastSyncTimestamp();

    if (!since) {
      await likesService.fullSync();
      return;
    }

    const rows: BackendLikeRow[] = await authFetch(
      `${API_URL}/likes/sync?since=${encodeURIComponent(since)}`
    );

    if (!rows?.length) return;

    for (const row of rows) {
      if (row.deleted_at) {
        await removeLike(row.track_id);
      } else {
        await upsertLike(toLocalRow(row));
      }
    }
  },

  /**
   * Smart sync: usa delta si hay timestamp, full si no.
   * Llamar al abrir la app y al volver de background.
   */
  sync: async (): Promise<void> => {
    try {
      await likesService.deltaSync();
    } catch (error) {
      console.warn("[likesService] sync failed:", error);
    }
  },

  /**
   * Carga inicial desde SQLite (sin red, instantaneo).
   * Devuelve el Set de IDs para el provider.
   */
  loadLocalLikes: async (): Promise<LikedTrackRow[]> => {
    return getAllLikes();
  },
};