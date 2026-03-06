import Constants from "expo-constants";
export interface Artist {
  header: {
    name: string;
    description: string;
    thumbnails: { url: string; width: number; height: number }[];
  };
  top_songs: TopSong[];
  albums: Album[];
  singles_eps?: Single[];
  related: RelatedArtist[];
  new_releases?: NewRelease[];
}

export interface TopSong {
  id: string;  
  title: string;
  artist_name?: string | null;
  artist_id?: string | null;
  album_id?: string | null;
  duration?: string;
  duration_seconds?: number;
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
  subtitle: string;
  thumbnails: { url: string; width: number; height: number }[];
}

export interface Song {
  id: string;
  title: string;
  artist_name?: string | null;
  artist_id?: string;
  album_id?: string | null;
  duration?: string;
  duration_seconds?: number;
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
    duration_seconds?: number;
    playlistId?: string;
    artists: { id: string | null; name: string | null }[];
    artist_id: string | null;
    artist_name: string | null;
  }[];
}

export interface NewRelease {
  id: string; 
  title: string;
  artist: string;
  artist_id?: string;
  thumb?: string | null;
  release_date?: string;
  track_count?: number | null;
  url?: string;
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
      artist: song.artist_name,
      artist_id: song.artist_id,
      album: song.album_id ?? null,
      duration_seconds: song.duration_seconds ?? null,
      thumbnail_url: song.thumbnail,
    }),
  });
  if (!res.ok) throw new Error("Error al agregar a la playlist");
  return res.json();
}