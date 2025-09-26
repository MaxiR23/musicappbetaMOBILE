import Constants from "expo-constants";
import { useCallback } from "react";
import { supabase } from "../lib/supabase";
import { AlbumDetails, Artist, Song } from "./../types/music";

const BASE_URL =
  (Constants?.expoConfig as any)?.extra?.EXPO_PUBLIC_API_URL
  ?? process.env.EXPO_PUBLIC_API_URL
  ?? "http://66.55.75.224:8000/api";

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

/* ===================== helpers payload ===================== */
const first = (...vals: any[]) => vals.find(v => v !== undefined && v !== null && v !== "");
const mmssToMs = (s?: string | null) => {
  if (!s) return null;
  const m = String(s).match(/^(\d+):(\d{1,2})$/);
  if (!m) return null;
  const min = parseInt(m[1], 10);
  const sec = parseInt(m[2], 10);
  return (min * 60 + sec) * 1000;
};

const toTrackPayload = (song: any) => {
  const id = first(song?.id, song?.videoId, song?.track_id, song?.video_id);

  const duration_ms =
    song?.duration_ms ??
    (song?.durationSeconds != null
      ? Math.round(Number(song.durationSeconds) * 1000)
      : mmssToMs(song?.duration));

  const thumbnail_url =
    first(song?.thumbnail_url, song?.thumbnail, song?.albumCover) ??
    song?.thumbnails?.[0]?.url ??
    null;

  const artist_id = first(song?.artistId, song?.artist_id, song?.artists?.[0]?.id, null);
  const artist =
    first(
      song?.artistName,
      song?.artist,
      Array.isArray(song?.artists) ? song.artists.map((a: any) => a?.name).filter(Boolean).join(", ") : null
    ) ?? null;

  const album = first(song?.albumId, song?.album, null);

  return {
    id,
    track_id: id,
    artist_id,
    album,
    duration_ms,
    thumbnail_url,
    extra: song,
    title: song?.title ?? null,
    artist,
  };
};
/* =========================================================== */

type SourcePayload = {
  name?: string | null;   // display name para UI
  thumb?: string | null;  // thumbnail url
};

type RecentItem = {
  type: "album" | "artist";
  id: string;
  occurred_at: string;
  name?: string | null;
  thumbnail_url?: string | null;
};

export function useMusicApi() {
  // 🔎 públicos
  const searchSongs = useCallback(
    async (query: string): Promise<Song[]> => {
      return authFetch(`${BASE_URL}/music/search?q=${encodeURIComponent(query)}`);
    },
    []
  );

  const playSongUrl = useCallback(
    (id: string): string => {
      return `${BASE_URL}/music/play?id=${encodeURIComponent(id)}&redir=1`;
    },
    []
  );

  const prefetchSongs = useCallback(
    async (ids: string[]): Promise<void> => {
      if (!ids?.length) return;
      return publicFetch(`${BASE_URL}/music/prefetch`, {
        method: "POST",
        body: JSON.stringify({ ids }),
      });
    },
    []
  );

  const getReleases = useCallback(
    async (): Promise<Song[]> => {
      return publicFetch(`${BASE_URL}/music/releases`);
    },
    []
  );

  const getArtist = useCallback(
    async (id: string): Promise<Artist> => {
      return publicFetch(`${BASE_URL}/music/artist/${encodeURIComponent(id)}`);
    },
    []
  );

  const getAlbum = useCallback(
    async (id: string): Promise<AlbumDetails> => {
      return publicFetch(`${BASE_URL}/music/album/${encodeURIComponent(id)}`);
    },
    []
  );

  // 🔒 privados
  const getPlaylists = useCallback(async (): Promise<any[]> => {
    return authFetch(`${BASE_URL}/playlists/`);
  }, []);

  const getPlaylistById = useCallback(async (id: string): Promise<any> => {
    return authFetch(`${BASE_URL}/playlists/${encodeURIComponent(id)}`);
  }, []);

  const createPlaylist = useCallback(
    async (title: string, description?: string, is_public?: boolean) => {
      return authFetch(`${BASE_URL}/playlists`, {
        method: "POST",
        body: JSON.stringify({
          title,
          description: description ?? null,
          is_public: !!is_public,
        }),
      });
    },
    []
  );

  const addTrackToPlaylist = useCallback(
    async (playlistId: string, song: Song) => {
      const payload = toTrackPayload(song as any);
      console.log("[API] addTrackToPlaylist →", { playlistId, payload });
      return authFetch(
        `${BASE_URL}/playlists/${encodeURIComponent(playlistId)}/tracks`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );
    },
    []
  );

  const deletePlaylist = useCallback(
    async (playlistId: string) => {
      return authFetch(
        `${BASE_URL}/playlists/${encodeURIComponent(playlistId)}`,
        { method: "DELETE" }
      );
    },
    []
  );

  const removeTrackFromPlaylist = useCallback(
    async (playlistId: string, trackId: string) => {
      return authFetch(
        `${BASE_URL}/playlists/${encodeURIComponent(playlistId)}/tracks/${encodeURIComponent(trackId)}`,
        { method: "DELETE" }
      );
    },
    []
  );

  // 🔒 registrar "play" de álbum — enviar claves que el backend lee (NO anidar todo en source)
  const logPlayAlbum = useCallback(
    async (albumId: string, source?: SourcePayload) => {
      const body: any = {};
      if (source?.name) body.display_name = source.name;
      if (source?.thumb) body.thumbnail_url = source.thumb;
      return authFetch(
        `${BASE_URL}/music/plays/albums/${encodeURIComponent(albumId)}`,
        { method: "POST", body: JSON.stringify(body) }
      );
    },
    []
  );

  // 🔒 registrar "play" de artista — idem
  const logPlayArtist = useCallback(
    async (artistId: string, source?: SourcePayload) => {
      const body: any = {};
      if (source?.name) body.display_name = source.name;
      if (source?.thumb) body.thumbnail_url = source.thumb;
      return authFetch(
        `${BASE_URL}/music/plays/artists/${encodeURIComponent(artistId)}`,
        { method: "POST", body: JSON.stringify(body) }
      );
    },
    []
  );

  // ❤️ Likes / Unlikes (auth)
  const likeTrack = useCallback(
    async (trackId: string) => {
      return authFetch(
        `${BASE_URL}/music/likes/tracks/${encodeURIComponent(trackId)}`,
        { method: "POST" }
      );
    },
    []
  );

  const unlikeTrack = useCallback(
    async (trackId: string) => {
      return authFetch(
        `${BASE_URL}/music/unlikes/tracks/${encodeURIComponent(trackId)}`,
        { method: "POST" }
      );
    },
    []
  );

  const likeAlbum = useCallback(
    async (albumId: string) => {
      return authFetch(
        `${BASE_URL}/music/likes/albums/${encodeURIComponent(albumId)}`,
        { method: "POST" }
      );
    },
    []
  );

  const unlikeAlbum = useCallback(
    async (albumId: string) => {
      return authFetch(
        `${BASE_URL}/music/unlikes/albums/${encodeURIComponent(albumId)}`,
        { method: "POST" }
      );
    },
    []
  );

  const likeArtist = useCallback(
    async (artistId: string) => {
      return authFetch(
        `${BASE_URL}/music/likes/artists/${encodeURIComponent(artistId)}`,
        { method: "POST" }
      );
    },
    []
  );

  const unlikeArtist = useCallback(
    async (artistId: string) => {
      return authFetch(
        `${BASE_URL}/music/unlikes/artists/${encodeURIComponent(artistId)}`,
        { method: "POST" }
      );
    },
    []
  );

  const likePlaylist = useCallback(
    async (playlistId: string) => {
      return authFetch(
        `${BASE_URL}/music/likes/playlists/${encodeURIComponent(playlistId)}`,
        { method: "POST" }
      );
    },
    []
  );

  const unlikePlaylist = useCallback(
    async (playlistId: string) => {
      return authFetch(
        `${BASE_URL}/music/unlikes/playlists/${encodeURIComponent(playlistId)}`,
        { method: "POST" }
      );
    },
    []
  );

  // Checker disponible en tu backend
  const isTrackLiked = useCallback(
    async (trackId: string): Promise<{ track_id: string; liked: boolean }> => {
      return authFetch(
        `${BASE_URL}/music/likes/tracks/${encodeURIComponent(trackId)}`,
        { method: "GET" }
      );
    },
    []
  );

  // 🔥 NUEVO: recientes del usuario (álbumes/artistas)
  const getRecentPlays = useCallback(
    async (limit = 20): Promise<{ items: RecentItem[] }> => {
      return authFetch(`${BASE_URL}/music/me/recent?limit=${encodeURIComponent(limit)}`, { method: "GET" });
    },
    []
  );

  return {
    searchSongs,
    playSongUrl,
    prefetchSongs,
    getReleases,
    getArtist,
    getAlbum,
    getPlaylists,
    getPlaylistById,
    createPlaylist,
    addTrackToPlaylist,
    deletePlaylist,
    removeTrackFromPlaylist,
    logPlayAlbum,
    logPlayArtist,
    likeTrack,
    unlikeTrack,
    likeAlbum,
    unlikeAlbum,
    likeArtist,
    unlikeArtist,
    likePlaylist,
    unlikePlaylist,
    isTrackLiked,
    getRecentPlays, // ← export nuevo
  };
}