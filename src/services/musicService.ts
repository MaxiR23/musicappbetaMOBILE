// services/musicService.ts
import { cacheClearPrefix, cacheWrap } from "@/src/utils/cache";
import { toTrackPayload } from "@/src/utils/music-helpers";
import Constants from "expo-constants";
import { supabase } from "../lib/supabase";
import { AlbumDetails, Artist, Song } from "../types/music";

const BASE_URL =
  (Constants?.expoConfig as any)?.extra?.EXPO_PUBLIC_API_URL
  ?? process.env.EXPO_PUBLIC_API_URL
  ?? "http://66.55.75.224:8000/api";

// ==================== FETCH HELPERS ====================

async function publicFetch<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

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

// ==================== TYPES ====================

type SourcePayload = {
  name?: string | null;
  thumb?: string | null;
};

export type RecentItem = {
  type: "album" | "artist";
  id: string;
  occurred_at: string;
  name?: string | null;
  thumbnail_url?: string | null;
};

type CacheVersions = Record<string, string>;

// ==================== API FUNCTIONS ====================

export const musicService = {
  // ==================== PUBLIC ====================

  searchSongs: async (query: string): Promise<Song[]> => {
    return authFetch(`${BASE_URL}/music/search?q=${encodeURIComponent(query)}`);
  },

  playSongUrl: (id: string): string => {
    return `${BASE_URL}/music/play?id=${encodeURIComponent(id)}&redir=1`;
  },

  prefetchSongs: async (ids: string[]): Promise<void> => {
    if (!ids?.length) return;
    return authFetch(`${BASE_URL}/music/prefetch`, {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
  },

  getReleases: async (): Promise<Song[]> => {
    return authFetch(`${BASE_URL}/music/releases`);
  },

  getArtist: async (id: string, versions: CacheVersions): Promise<Artist> => {
    return cacheWrap(
      `artist:${id}`,
      () => authFetch(`${BASE_URL}/music/artist/${encodeURIComponent(id)}`),
      { version: versions['artist'] }
    );
  },

  getAlbum: async (id: string, versions: CacheVersions): Promise<AlbumDetails> => {
    return cacheWrap(
      `album:${id}`,
      () => authFetch(`${BASE_URL}/music/album/${encodeURIComponent(id)}`),
      { version: versions['album'] }
    );
  },

  getArtistAlbums: async (id: string, versions: CacheVersions): Promise<{ artist_id: string; total: number; albums: any[] }> => {
    return cacheWrap(
      `artist:${id}:albums_all`,
      () => authFetch(`${BASE_URL}/music/artist/${encodeURIComponent(id)}/albums`),
      { version: versions['artist-albums'] }
    );
  },

  getArtistSingles: async (id: string, versions: CacheVersions): Promise<{ artist_id: string; total: number; singles: any[] }> => {
    return cacheWrap(
      `artist:${id}:singles_all`,
      () => authFetch(`${BASE_URL}/music/artist/${encodeURIComponent(id)}/singles`),
      { version: versions['artist-singles'] }
    );
  },

  // ==================== GENRES ====================

  getGenres: async (versions: CacheVersions): Promise<{ ok: boolean; genres: any[] }> => {
    return cacheWrap(
      'genres:list',
      () => authFetch(`${BASE_URL}/genres`),
      { version: versions['genre-playlists'] }
    );
  },

  getGenrePlaylists: async (slug: string, versions: CacheVersions, category?: string): Promise<{ ok: boolean; genre: any; playlists: any[] }> => {
    const url = category
      ? `${BASE_URL}/genres/${encodeURIComponent(slug)}/playlists?category=${encodeURIComponent(category)}`
      : `${BASE_URL}/genres/${encodeURIComponent(slug)}/playlists`;

    return cacheWrap(
      `genre:${slug}:playlists${category ? `:${category}` : ''}`,
      () => authFetch(url),
      { version: versions['genre-playlists'] }
    );
  },

  getGenreCategories: async (slug: string, versions: CacheVersions): Promise<{ ok: boolean; genre: any; categories: string[] }> => {
    return cacheWrap(
      `genre:${slug}:categories`,
      () => authFetch(`${BASE_URL}/genres/${encodeURIComponent(slug)}/categories`),
      { version: versions['genre-playlists'] }
    );
  },

  getGenrePlaylistTracks: async (playlistId: string, versions: CacheVersions, limit?: number): Promise<{ ok: boolean; playlist: any; tracks: any[] }> => {
    const url = limit
      ? `${BASE_URL}/playlists/${encodeURIComponent(playlistId)}/tracks?limit=${limit}`
      : `${BASE_URL}/playlists/${encodeURIComponent(playlistId)}/tracks`;

    return cacheWrap(
      `genre-playlist:${playlistId}:tracks`,
      () => authFetch(url),
      { version: versions['genre-playlists'] }
    );
  },

  // ==================== PRIVATE (AUTH) ====================

  getPlaylists: async (versions: CacheVersions): Promise<any[]> => {
    return cacheWrap(
      'playlists:list',
      () => authFetch(`${BASE_URL}/playlists/`),
      { version: versions['user-playlists'] }
    );
  },

  getPlaylistById: async (id: string, versions: CacheVersions): Promise<any> => {
    return cacheWrap(
      `playlist:${id}`,
      () => authFetch(`${BASE_URL}/playlists/${encodeURIComponent(id)}`),
      { version: versions['user-playlists'] }
    );
  },

  createPlaylist: async (title: string, description?: string, is_public?: boolean) => {
    const result = await authFetch(`${BASE_URL}/playlists`, {
      method: "POST",
      body: JSON.stringify({
        title,
        description: description ?? null,
        is_public: !!is_public,
      }),
    });

    await cacheClearPrefix('playlists:list');
    return result;
  },

  addTrackToPlaylist: async (playlistId: string, song: Song) => {
    const payload = toTrackPayload(song as any);
    console.log("[API] addTrackToPlaylist →", { playlistId, payload });

    const result = await authFetch(
      `${BASE_URL}/playlists/${encodeURIComponent(playlistId)}/tracks`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    await cacheClearPrefix(`playlist:${playlistId}`);
    return result;
  },

  deletePlaylist: async (playlistId: string) => {
    const result = await authFetch(
      `${BASE_URL}/playlists/${encodeURIComponent(playlistId)}`,
      { method: "DELETE" }
    );

    await cacheClearPrefix(`playlist:${playlistId}`);
    await cacheClearPrefix('playlists:list');
    return result;
  },

  removeTrackFromPlaylist: async (playlistId: string, trackId: string) => {
    const result = await authFetch(
      `${BASE_URL}/playlists/${encodeURIComponent(playlistId)}/tracks/${encodeURIComponent(trackId)}`,
      { method: "DELETE" }
    );

    await cacheClearPrefix(`playlist:${playlistId}`);
    return result;
  },

  // ==================== PLAY LOGS ====================

  logPlayAlbum: async (albumId: string, source?: SourcePayload) => {
    const body: any = {};
    if (source?.name) body.display_name = source.name;
    if (source?.thumb) body.thumbnail_url = source.thumb;
    return authFetch(
      `${BASE_URL}/music/plays/albums/${encodeURIComponent(albumId)}`,
      { method: "POST", body: JSON.stringify(body) }
    );
  },

  logPlayArtist: async (artistId: string, source?: SourcePayload) => {
    const body: any = {};
    if (source?.name) body.display_name = source.name;
    if (source?.thumb) body.thumbnail_url = source.thumb;
    return authFetch(
      `${BASE_URL}/music/plays/artists/${encodeURIComponent(artistId)}`,
      { method: "POST", body: JSON.stringify(body) }
    );
  },

  logPlayTrack: async (trackId: string, source?: SourcePayload) => {
    const body: any = {};
    if (source?.name) body.display_name = source.name;
    if (source?.thumb) body.thumbnail_url = source.thumb;
    return authFetch(
      `${BASE_URL}/music/plays/tracks/${encodeURIComponent(trackId)}`,
      { method: "POST", body: JSON.stringify(body) }
    );
  },

  // ==================== LIKES ====================

  likeTrack: async (trackId: string) => {
    return authFetch(
      `${BASE_URL}/music/likes/tracks/${encodeURIComponent(trackId)}`,
      { method: "POST" }
    );
  },

  unlikeTrack: async (trackId: string) => {
    return authFetch(
      `${BASE_URL}/music/unlikes/tracks/${encodeURIComponent(trackId)}`,
      { method: "POST" }
    );
  },

  likeAlbum: async (albumId: string) => {
    return authFetch(
      `${BASE_URL}/music/likes/albums/${encodeURIComponent(albumId)}`,
      { method: "POST" }
    );
  },

  unlikeAlbum: async (albumId: string) => {
    return authFetch(
      `${BASE_URL}/music/unlikes/albums/${encodeURIComponent(albumId)}`,
      { method: "POST" }
    );
  },

  likeArtist: async (artistId: string) => {
    return authFetch(
      `${BASE_URL}/music/likes/artists/${encodeURIComponent(artistId)}`,
      { method: "POST" }
    );
  },

  unlikeArtist: async (artistId: string) => {
    return authFetch(
      `${BASE_URL}/music/unlikes/artists/${encodeURIComponent(artistId)}`,
      { method: "POST" }
    );
  },

  likePlaylist: async (playlistId: string) => {
    return authFetch(
      `${BASE_URL}/music/likes/playlists/${encodeURIComponent(playlistId)}`,
      { method: "POST" }
    );
  },

  unlikePlaylist: async (playlistId: string) => {
    return authFetch(
      `${BASE_URL}/music/unlikes/playlists/${encodeURIComponent(playlistId)}`,
      { method: "POST" }
    );
  },

  isTrackLiked: async (trackId: string): Promise<{ track_id: string; liked: boolean }> => {
    return authFetch(
      `${BASE_URL}/music/likes/tracks/${encodeURIComponent(trackId)}`,
      { method: "GET" }
    );
  },

  // ==================== OTHER ====================

  getRecentPlays: async (limit = 20): Promise<{ items: RecentItem[] }> => {
    return authFetch(
      `${BASE_URL}/music/me/recent?limit=${encodeURIComponent(limit)}`,
      { method: "GET" }
    );
  },

  moveTrackInPlaylist: async (playlistId: string, oldPosition: number, newPosition: number) => {
    const result = await authFetch(
      `${BASE_URL}/music/playlists/${encodeURIComponent(playlistId)}/move-track`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ old_position: oldPosition, new_position: newPosition }),
      }
    );

    await cacheClearPrefix(`playlist:${playlistId}`);
    return result;
  },

  getTrackLyrics: async (trackId: string): Promise<{ ok: boolean; lyrics?: string | null; source?: string | null }> => {
    return authFetch(`${BASE_URL}/music/tracks/${encodeURIComponent(trackId)}/lyrics`, {
      method: "GET",
    });
  },

  getTrackUpNext: async (trackId: string): Promise<{
    ok: boolean;
    current?: any;
    upNext?: any[];
    autoplay?: any;
  }> => {
    return authFetch(`${BASE_URL}/music/tracks/${encodeURIComponent(trackId)}/upnext`, {
      method: "GET",
    });
  },

  getTrackRelated: async (trackId: string): Promise<{
    ok: boolean;
    related?: any[];
  }> => {
    return authFetch(`${BASE_URL}/music/tracks/${encodeURIComponent(trackId)}/related`, {
      method: "GET",
    });
  },
};