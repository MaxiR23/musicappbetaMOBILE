import { API_URL } from "@/constants/config";
import { supabase } from "@/lib/supabase";
import { cacheClearPrefix, cacheWrap } from "@/utils/cache";

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

// Input para add_library_item (POST /library): sigue usando "album" | "playlist"
// porque asi esta guardado en la tabla library_items.
export type LibraryKind = "album" | "playlist";

export interface LibraryItemInput {
  kind: LibraryKind;
  external_id: string;
  title: string;
  thumbnail_url?: string;
  artist?: string;
  artist_id?: string;
  album_id?: string;
  album_name?: string;
}

// Item devuelto por add/remove (shape crudo de la tabla).
export interface LibraryItem {
  id: string;
  user_id: string;
  kind: LibraryKind;
  external_id: string;
  title: string;
  thumbnail_url: string;
  artist: string;
  artist_id: string;
  album_id: string;
  album_name: string;
  added_at: string;
  updated_at: string;
}

// Item de la grilla unificada (GET /library).
export type LibraryViewKind =
  | "liked"
  | "own_playlist"
  | "saved_playlist"
  | "saved_album";

export interface LibraryViewItem {
  kind: LibraryViewKind;
  id: string;
  title: string;
  thumbnail_url: string;
  subtitle: string;
  sorted_at: string;
}

export interface LibraryView {
  sort: "recents";
  items: LibraryViewItem[];
}

// ── SERVICE ───────────────────────────────────────────────────────────────────

const CACHE_KEY = "library-view:list";
const CACHE_PREFIX = "library-view";

export const libraryService = {
  /**
   * Grilla unificada: liked + playlists propias + items saved (albums/playlists).
   * Reemplaza a los viejos getPlaylists + getLikedPlaylist + libraryService.list.
   */
  getView: async (
    version: string,
    sort: "recents" = "recents",
  ): Promise<LibraryView> => {
    if (!version) {
      throw new Error("libraryService.getView requires a non-empty version");
    }
    return cacheWrap(
      CACHE_KEY,
      () => authFetch<LibraryView>(`${API_URL}/library?sort=${sort}`),
      { version }
    );
  },

  /**
   * Guarda un album o playlist de terceros en library_items.
   * Invalida la grilla unificada del front.
   */
  add: async (payload: LibraryItemInput): Promise<{ ok: boolean; item: LibraryItem }> => {
    const result = await authFetch(`${API_URL}/library`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    await cacheClearPrefix(CACHE_PREFIX);
    return result;
  },

  /**
   * Saca un album o playlist guardado.
   * Invalida la grilla unificada del front.
   */
  remove: async (
    kind: LibraryKind,
    externalId: string,
  ): Promise<{ ok: boolean; removed: LibraryItem }> => {
    const result = await authFetch(
      `${API_URL}/library/${encodeURIComponent(kind)}/${encodeURIComponent(externalId)}`,
      { method: "DELETE" }
    );
    await cacheClearPrefix(CACHE_PREFIX);
    return result;
  },
};