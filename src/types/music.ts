import Constants from "expo-constants";

// src/api/music.ts
export interface Artist {
  header: {
    name: string;
    description: string;
    thumbnails: { url: string; width: number; height: number }[];
    monthlyListeners?: string;
  };
  topSongs: TopSong[];
  albums: Album[];
  singles_eps?: Single[];
  related: RelatedArtist[];
  newReleases?: NewRelease[];
}

export interface TopSong {
  id: string;  
  title: string;
  artistName?: string | null;
  artistId?: string | null;
  albumId?: string | null;
  duration?: string;
  durationSeconds?: number;
  thumbnail?: string | null;
}

export interface Album {
  id: string;
  title: string;
  year?: string;
  thumbnails: { url: string; width: number; height: number }[];
}

export interface Single {
  id: string;
  title: string;
  type?: string;
  year?: string;
  thumbnails: { url: string; width: number; height: number }[];
}

export interface RelatedArtist {
  id: string;
  name: string;
  subtitle: string; // 👈 viene así del backend
  thumbnails: { url: string; width: number; height: number }[];
}

export interface Song {
  id: string;
  title: string;
  artistName?: string | null;
  artistId?: string;
  albumId?: string | null;
  duration?: string;
  durationSeconds?: number;
  thumbnail: string; 
  url: string;
}

export interface AlbumDetails {
  id: string;
  info: {
    title: string;
    subtitle?: string;
    description?: string;
    thumbnails: { url: string; width: number; height: number }[];
  };
  tracks: {
    id: string;
    title: string;
    duration?: string;
    durationSeconds?: number;
    playlistId?: string;
    artists: { id: string | null; name: string | null }[];
    artistId: string | null;
    artistName: string | null;
  }[];
}

export interface NewRelease {
  id: string;          // album browseId (MPREb_…)
  title: string;       // nombre del álbum
  artist: string;      // nombre(s) del artista
  artist_id?: string;  // UC… (opcional)
  thumb?: string | null;
  release_date?: string; // "YYYY-MM-DD"
  track_count?: number | null;
  url?: string;        // "/browse/MPREb_…"
}

const BASE_URL =
  (Constants?.expoConfig as any)?.extra?.EXPO_PUBLIC_API_URL
  ?? process.env.EXPO_PUBLIC_API_URL
  ?? "http://66.55.75.224:8000/api";

// === Públicos (no requieren auth) ===
export async function searchSongs(fetchFn: typeof fetch, query: string): Promise<Song[]> {
  const res = await fetchFn(`${BASE_URL}/music/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("Error al buscar canciones");
  return res.json();
}

export async function playSongUrl(id: string): Promise<string> {
  return `${BASE_URL}/music/play?id=${encodeURIComponent(id)}`;
}

export async function prefetchSongs(ids: string[]) {
  if (!ids?.length) return;
  await fetch(`${BASE_URL}/music/prefetch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  }).catch((err) => console.warn("prefetch error:", err));
}

export async function getReleases(fetchFn: typeof fetch): Promise<Song[]> {
  const res = await fetchFn(`${BASE_URL}/music/releases`);
  if (!res.ok) throw new Error("Error al obtener releases");
  return res.json();
}

export async function getArtist(fetchFn: typeof fetch, id: string): Promise<Artist> {
  const res = await fetchFn(`${BASE_URL}/music/artist/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error("Error al obtener artista");
  return res.json();
}

export async function getAlbum(fetchFn: typeof fetch, id: string): Promise<AlbumDetails> {
  const res = await fetchFn(`${BASE_URL}/music/album/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error("Error al cargar el álbum");
  return res.json();
}

// === Privados (requieren auth) ===
export async function getPlaylists(fetchFn: typeof fetch): Promise<any[]> {
  const res = await fetchFn(`${BASE_URL}/playlists`);
  if (!res.ok) throw new Error("Error al obtener playlists");
  return res.json();
}

export async function createPlaylist(fetchFn: typeof fetch, name: string): Promise<any> {
  const res = await fetchFn(`${BASE_URL}/playlists`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Error al crear playlist");
  return res.json();
}

export async function addTrackToPlaylist(fetchFn: typeof fetch, playlistId: string, song: Song) {
  const res = await fetchFn(`${BASE_URL}/playlists/${playlistId}/tracks`, {
    method: "POST",
    body: JSON.stringify({
      track_id: song.id,
      title: song.title,
      artist: song.artistName,
      artist_id: song.artistId,
      album: song.albumId ?? null,
      duration_ms: song.durationSeconds ?? null,
      thumbnail_url: song.thumbnail,
    }),
  });
  if (!res.ok) throw new Error("Error al agregar a la playlist");
  return res.json();
}