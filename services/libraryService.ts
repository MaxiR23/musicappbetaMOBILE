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

export type LibraryKind = "album" | "playlist";

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

export const libraryService = {
  list: async (
    version: string,
    kind?: LibraryKind,
  ): Promise<{ items: LibraryItem[] }> => {
    if (!version) {
      throw new Error("libraryService.list requires a non-empty version");
    }
    const url = kind
      ? `${API_URL}/library/?kind=${encodeURIComponent(kind)}`
      : `${API_URL}/library/`;
    const cacheKey = kind ? `library:list:${kind}` : "library:list";

    return cacheWrap(
      cacheKey,
      () => authFetch(url),
      { version }
    );
  },

  add: async (payload: LibraryItemInput): Promise<{ ok: boolean; item: LibraryItem }> => {
    const result = await authFetch(`${API_URL}/library/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    await cacheClearPrefix("library:list");
    return result;
  },

  remove: async (
    kind: LibraryKind,
    externalId: string
  ): Promise<{ ok: boolean; removed: LibraryItem }> => {
    const result = await authFetch(
      `${API_URL}/library/${encodeURIComponent(kind)}/${encodeURIComponent(externalId)}`,
      { method: "DELETE" }
    );
    await cacheClearPrefix("library:list");
    return result;
  },
};