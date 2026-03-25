import { API_URL } from "@/constants/config";
import { cacheClearPrefix, cacheWrap } from "@/utils/cache";
import { toTrackPayload } from "@/utils/music-helpers";
import { emitPlaylistChange } from "@/utils/playlist-events";
import { MappedSong, mapGenericTrack } from "@/utils/song-mapper";
import { supabase } from "../lib/supabase";
import { AlbumDetails, Artist, Song } from "../types/music";

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

type SourcePayload = {
  name?: string | null;
  thumb?: string | null;
};

export type RecentItem = {
  type: "album" | "artist" | "playlist";
  id: string;
  played_at: string;
  name?: string | null;
  thumbnail_url?: string | null;
};

export type UpcomingRelease = {
  id: string;
  release_date: string | null;
  artist: string | null;
  album: string | null;
  label: string | null;
  thumbnail: string | null;
  track_count: number | null;
  artist_id: string | null;
};

export type ListenAgainAlbum = {
  album_id: string;
  album_name: string;
  artist_id: string;
  artist_name: string;
  thumbnail_url: string;
  total_plays: number;
  last_played_at: string;
};

type CacheVersions = Record<string, string>;

export const musicService = {
  searchSongs: async (query: string): Promise<Song[]> => {
    return authFetch(`${API_URL}/music/search?q=${encodeURIComponent(query)}`);
  },

  playSongUrl: (id: string): string => {
    return `${API_URL}/music/play?id=${encodeURIComponent(id)}&redir=1`;
  },

  prefetchSongs: async (ids: string[]): Promise<void> => {
    if (!ids?.length) return;
    return authFetch(`${API_URL}/music/prefetch`, {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
  },

  getReleases: async (): Promise<Song[]> => {
    return authFetch(`${API_URL}/music/releases`);
  },

  getUpcomingReleases: async (
    versions: CacheVersions
  ): Promise<{ ok: boolean; count: number; releases: UpcomingRelease[] }> => {
    return cacheWrap(
      "upcoming-releases:next",
      async () => {
        const data = await authFetch(`${API_URL}/upcoming-releases/next`);
        if (!data?.ok) throw new Error("upcoming_releases_failed");
        return data;
      },
      { version: versions["upcoming-releases"] }
    );
  },

  getArtist: async (id: string, versions: CacheVersions): Promise<Artist> => {
    return cacheWrap(
      `artist:${id}`,
      async () => {
        const data = await authFetch(`${API_URL}/music/artist/${encodeURIComponent(id)}`);
        if (!data?.header) throw new Error("artist_incomplete");
        return data;
      },
      { version: versions['artist'] }
    );
  },

  getAlbum: async (id: string, versions: CacheVersions): Promise<AlbumDetails> => {
    return cacheWrap(
      `album:${id}`,
      async () => {
        const data = await authFetch(`${API_URL}/music/album/${encodeURIComponent(id)}`);
        if (!data?.tracks?.length) throw new Error("album_incomplete");
        return data;
      },
      { version: versions['album'] }
    );
  },

  getArtistAlbums: async (id: string, versions: CacheVersions): Promise<{ artist_id: string; total: number; albums: any[] }> => {
    return cacheWrap(
      `artist:${id}:albums_all`,
      async () => {
        const data = await authFetch(`${API_URL}/music/artist/${encodeURIComponent(id)}/albums`);
        if (!data?.albums?.length) throw new Error("artist_albums_incomplete");
        return data;
      },
      { version: versions['artist-albums'] }
    );
  },

  getArtistSingles: async (id: string, versions: CacheVersions): Promise<{ artist_id: string; total: number; singles: any[] }> => {
    return cacheWrap(
      `artist:${id}:singles_all`,
      async () => {
        const data = await authFetch(`${API_URL}/music/artist/${encodeURIComponent(id)}/singles`);
        if (!data?.singles?.length) throw new Error("artist_singles_incomplete");
        return data;
      },
      { version: versions['artist-singles'] }
    );
  },


  getGenres: async (versions: CacheVersions): Promise<{ ok: boolean; genres: any[] }> => {
    return cacheWrap(
      'genres:list',
      async () => {
        const data = await authFetch(`${API_URL}/genres`);
        if (!data?.genres?.length) throw new Error("genres_incomplete");
        return data;
      },
      { version: versions['genre-playlists'] }
    );
  },

  getGenrePlaylists: async (slug: string, versions: CacheVersions, category?: string): Promise<{ ok: boolean; genre: any; playlists: any[] }> => {
    const url = category
      ? `${API_URL}/genres/${encodeURIComponent(slug)}/playlists?category=${encodeURIComponent(category)}`
      : `${API_URL}/genres/${encodeURIComponent(slug)}/playlists`;

    return cacheWrap(
      `genre:${slug}:playlists${category ? `:${category}` : ''}`,
      async () => {
        const data = await authFetch(url);
        if (!data?.playlists?.length) throw new Error("genre_playlists_incomplete");
        return data;
      },
      { version: versions['genre-playlists'] }
    );
  },

  getGenreCategories: async (slug: string, versions: CacheVersions): Promise<{ ok: boolean; genre: any; categories: string[] }> => {
    return cacheWrap(
      `genre:${slug}:categories`,
      async () => {
        const data = await authFetch(`${API_URL}/genres/${encodeURIComponent(slug)}/categories`);
        if (!data?.categories?.length) throw new Error("genre_categories_incomplete");
        return data;
      },
      { version: versions['genre-playlists'] }
    );
  },

  getGenrePlaylistTracks: async (playlistId: string, versions: CacheVersions, limit?: number): Promise<{ ok: boolean; playlist: any; tracks: any[] }> => {
    const url = limit
      ? `${API_URL}/playlists/${encodeURIComponent(playlistId)}/tracks?limit=${limit}`
      : `${API_URL}/playlists/${encodeURIComponent(playlistId)}/tracks`;

    return cacheWrap(
      `genre-playlist:${playlistId}:tracks`,
      async () => {
        const data = await authFetch(url);
        if (!data?.tracks?.length) throw new Error("genre_playlist_tracks_incomplete");
        return data;
      },
      { version: versions['genre-playlists'] }
    );
  },

  getPlaylists: async (versions: CacheVersions): Promise<any[]> => {
    return cacheWrap(
      'playlists:list',
      async () => {
        const data = await authFetch(`${API_URL}/playlists/`);
        return data;
      },
      { version: versions['user-playlists'] }
    );
  },

  getPlaylistById: async (id: string, versions: CacheVersions): Promise<any> => {
    return cacheWrap(
      `playlist:${id}`,
      async () => {
        const data = await authFetch(`${API_URL}/playlists/${encodeURIComponent(id)}`);
        if (!data?.id) throw new Error("playlist_incomplete");
        return data;
      },
      { version: versions['user-playlists'] }
    );
  },

  createPlaylist: async (title: string, description?: string, is_public?: boolean) => {
    const result = await authFetch(`${API_URL}/playlists/`, {
      method: "POST",
      body: JSON.stringify({
        title,
        description: description ?? null,
        is_public: !!is_public,
      }),
    });
    await cacheClearPrefix('playlists:list');
    emitPlaylistChange();
    return result;
  },

  updatePlaylist: async (playlistId: string, title: string, description?: string, is_public?: boolean) => {
    const result = await authFetch(`${API_URL}/playlists/${encodeURIComponent(playlistId)}`, {
      method: "PATCH",
      body: JSON.stringify({
        title,
        description: description ?? null,
        is_public: !!is_public,
      }),
    });
    await cacheClearPrefix(`playlist:${playlistId}`);
    await cacheClearPrefix('playlists:list');
    emitPlaylistChange();
    return result;
  },

  addTrackToPlaylist: async (playlistId: string, song: Song) => {
    const payload = toTrackPayload(song as any);
    const result = await authFetch(
      `${API_URL}/playlists/${encodeURIComponent(playlistId)}/tracks`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    await cacheClearPrefix(`playlist:${playlistId}`);
    await cacheClearPrefix('playlists:list');
    emitPlaylistChange();
    return result;
  },

  deletePlaylist: async (playlistId: string) => {
    const result = await authFetch(
      `${API_URL}/playlists/${encodeURIComponent(playlistId)}`,
      { method: "DELETE" }
    );
    await cacheClearPrefix(`playlist:${playlistId}`);
    await cacheClearPrefix('playlists:list');
    emitPlaylistChange();
    return result;
  },

  removeTrackFromPlaylist: async (playlistId: string, trackId: string) => {
    const result = await authFetch(
      `${API_URL}/playlists/${encodeURIComponent(playlistId)}/tracks/${encodeURIComponent(trackId)}`,
      { method: "DELETE" }
    );
    await cacheClearPrefix(`playlist:${playlistId}`);
    await cacheClearPrefix('playlists:list');
    emitPlaylistChange();
    return result;
  },

  logPlayAlbum: async (album_id: string, source?: SourcePayload) => {
    const body: any = {};
    if (source?.name) body.display_name = source.name;
    if (source?.thumb) body.thumbnail_url = source.thumb;
    return authFetch(
      `${API_URL}/music/plays/albums/${encodeURIComponent(album_id)}`,
      { method: "POST", body: JSON.stringify(body) }
    );
  },

  logPlayArtist: async (artist_id: string, source?: SourcePayload) => {
    const body: any = {};
    if (source?.name) body.display_name = source.name;
    if (source?.thumb) body.thumbnail_url = source.thumb;
    return authFetch(
      `${API_URL}/music/plays/artists/${encodeURIComponent(artist_id)}`,
      { method: "POST", body: JSON.stringify(body) }
    );
  },

  logPlayTrack: async (trackId: string, context?: {
    album_id?: string;
    album_name?: string;
    artist_id?: string;
    track_name?: string;
    artist_name?: string;
    duration_seconds?: number;
    thumbnail_url?: string;
  }) => {
    return authFetch(
      `${API_URL}/music/plays/tracks/${encodeURIComponent(trackId)}`,
      { method: "POST", body: JSON.stringify(context ?? {}) }
    );
  },

  logPlayPlaylist: async (playlistId: string, source?: SourcePayload) => {
    const body: any = {};
    if (source?.name) body.display_name = source.name;
    if (source?.thumb) body.thumbnail_url = source.thumb;
    return authFetch(
      `${API_URL}/music/plays/playlists/${encodeURIComponent(playlistId)}`,
      { method: "POST", body: JSON.stringify(body) }
    );
  },

  getWeeklyStats: async (options?: {
    include?: string;
    limit?: number;
  }): Promise<{
    week_start: string;
    artists?: any[];
    albums?: any[];
    tracks?: any[];
  }> => {
    const params = new URLSearchParams();
    if (options?.include) params.set("include", options.include);
    if (options?.limit) params.set("limit", String(options.limit));
    const query = params.toString();
    const url = `${API_URL}/stats/weekly${query ? `?${query}` : ""}`;
    const cacheKey = `weekly-stats${query ? `:${query}` : ""}`;
    return cacheWrap(cacheKey, () => authFetch(url), { userId: 'me' });
  },

  getMonthlyStats: async (options?: {
    include?: string;
    limit?: number;
  }): Promise<{
    month_start: string;
    artists?: any[];
    albums?: any[];
    tracks?: any[];
  }> => {
    const params = new URLSearchParams();
    if (options?.include) params.set("include", options.include);
    if (options?.limit) params.set("limit", String(options.limit));
    const query = params.toString();
    const url = `${API_URL}/stats/monthly${query ? `?${query}` : ""}`;
    const cacheKey = `monthly-stats${query ? `:${query}` : ""}`;
    return cacheWrap(cacheKey, () => authFetch(url), { userId: 'me' });
  },

  getRecentPlays: async (limit = 20): Promise<{ items: RecentItem[] }> => {
    return authFetch(
      `${API_URL}/music/me/recent?limit=${encodeURIComponent(limit)}`,
      { method: "GET" }
    );
  },

  getReplaySongs: async (): Promise<MappedSong[]> => {
    return cacheWrap(
      "feed:replay",
      async () => {
        const raw = await authFetch<any[]>(`${API_URL}/feed/replay`);
        return (raw || []).map((song) => mapGenericTrack({
          id: song.track_id,
          title: song.track_name,
          artist_name: song.artist_name,
          artist_id: song.artist_id,
          album_id: song.album_id,
          album_name: song.album_name,
          thumbnail: song.thumbnail_url,
          duration_seconds: song.duration_seconds,
        }));
      }
    );
  },

  getListenAgain: async (
    versions: CacheVersions
  ): Promise<{ ok: boolean; album: ListenAgainAlbum | null }> => {
    return cacheWrap(
      "feed:listen-again",
      async () => {
        const data = await authFetch(`${API_URL}/feed/listen-again`);
        if (!data?.ok) throw new Error("listen_again_failed");
        return data;
      },
      { version: versions["listen-again"] }
    );
  },

  moveTrackInPlaylist: async (playlistId: string, oldPosition: number, newPosition: number) => {
    const result = await authFetch(
      `${API_URL}/playlists/${encodeURIComponent(playlistId)}/move-track`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ old_position: oldPosition, new_position: newPosition }),
      }
    );
    await cacheClearPrefix(`playlist:${playlistId}`);
    await cacheClearPrefix('playlists:list');
    emitPlaylistChange();
    return result;
  },

  getTrackLyrics: async (trackId: string): Promise<{ ok: boolean; lyrics?: string | null; source?: string | null }> => {
    return authFetch(`${API_URL}/music/tracks/${encodeURIComponent(trackId)}/lyrics`, {
      method: "GET",
    });
  },

  getTrackUpNext: async (trackId: string): Promise<{
    ok: boolean;
    current?: any;
    upNext?: any[];
    autoplay?: any;
  }> => {
    return authFetch(`${API_URL}/music/tracks/${encodeURIComponent(trackId)}/upnext`, {
      method: "GET",
    });
  },

  getTrackRelated: async (trackId: string): Promise<{
    ok: boolean;
    related?: any[];
  }> => {
    return authFetch(`${API_URL}/music/tracks/${encodeURIComponent(trackId)}/related`, {
      method: "GET",
    });
  },
};