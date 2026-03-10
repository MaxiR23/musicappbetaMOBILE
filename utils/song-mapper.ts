/**
 * Interface para el formato estándar de una canción mapeada
 * Este es el formato que espera el reproductor
 */
export interface MappedSong {
  id: string;
  title: string;
  artist_name: string;
  artist_id: string | null;
  artists?: any[];
  album_name?: string | null;
  album_id?: string | null;
  thumbnail?: string;
  duration?: string | null;
  duration_seconds?: number | null;
  internalId?: string | number;
}

/**
 * Opciones para mapear canciones desde diferentes fuentes
 */
interface MapSongsOptions {
  /**
   * Thumbnail/cover por defecto si la canción no tiene
   */
  defaultThumbnail?: string;

  /**
   * ID del álbum (para canciones de álbum)
   */
  album_id?: string | null;

  /**
   * ID del artista (para canciones de artista)
   */
  artist_id?: string | null;

  /**
   * Nombre del álbum por defecto
   */
  album_name?: string | null;

  /**
   * Nombre del artista por defecto
   */
  defaultartist_name?: string;
}

/**
 * Mapea canciones de álbum al formato estándar del reproductor
 * 
 * @param tracks - Array de tracks del álbum
 * @param options - Opciones de mapeo
 * @returns Array de canciones en formato estándar
 */
export function mapAlbumTracks(
  tracks: any[],
  options: MapSongsOptions = {}
): MappedSong[] {
  if (!Array.isArray(tracks)) return [];
  const { defaultThumbnail, album_id, album_name } = options;

  return tracks.map((track: any) => {
    const artists = Array.isArray(track.artists) ? track.artists : [];
    const primary = artists[0] || null;

    const artist_name =
      track.artist_name ??
      (artists.length ? artists.map((a: any) => a.name).join(", ") : "");

    const artist_id =
      track.artist_id ??
      (primary && primary.id ? primary.id : null);

    const trackId = track.track_id || track.id;

    return {
      id: trackId,
      title: track.title,
      artist_name,
      artist_id,
      artists,
      album_id: track.album_id ?? album_id ?? null,
      album_name: track.album_name ?? album_name ?? null,
      duration: track.duration || null,
      duration_seconds: track.duration_seconds || null,
      thumbnail: defaultThumbnail || "",
    };
  });
}

/**
 * Mapea canciones de artista (top songs) al formato estándar del reproductor
 * 
 * @param topSongs - Array de top songs del artista
 * @param options - Opciones de mapeo
 * @returns Array de canciones en formato estándar
 */
export function mapArtistTopSongs(
  topSongs: any[],
  options: MapSongsOptions = {}
): MappedSong[] {
  if (!Array.isArray(topSongs)) return [];
  const { artist_id, defaultartist_name } = options;

  return topSongs.map((song: any) => {
    const artistsArr = Array.isArray(song.artists) ? song.artists : [];
    const primary = artistsArr[0] || null;

    const artist_name =
      song.artist_name ??
      (artistsArr.length
        ? artistsArr.map((a: any) => a.name).join(", ")
        : defaultartist_name || "");

    const resolvedartist_id =
      song.artist_id ??
      primary?.id ??
      artist_id ??
      null;

    const trackId = song.track_id ?? song.id;
    const album_id = song.album_id ?? song.album?.id ?? null;
    const album_name = song.album_name ?? song.album?.name ?? null;

    return {
      id: trackId,
      title: song.title,
      thumbnail: song.thumbnail,
      duration: song.duration,
      duration_seconds: song.duration_seconds,
      artist_name,
      artist_id: resolvedartist_id,
      artists: artistsArr,
      album_id,
      album_name,
    };
  });
}

/**
 * Mapea canciones de playlist al formato estándar del reproductor
 * 
 * @param playlistSongs - Array de canciones de la playlist
 * @returns Array de canciones en formato estándar
 */
export function mapPlaylistSongs(playlistSongs: any[]): MappedSong[] {
  if (!Array.isArray(playlistSongs)) return [];
  return playlistSongs.map((song: any) => ({
    id: song.id,
    internalId: song.internalId,
    title: song.title,
    artist_name: song.artist,
    artist_id: song.artist_id ?? null,
    album_id: song.album_id ?? null,
    thumbnail: song.albumCover,
    duration: song.duration,
    duration_seconds: null,
  }));
}

export function mapPresentingTracks(tracks: any[]): MappedSong[] {
  if (!Array.isArray(tracks)) return [];
  return tracks.map((track: any) => ({
    id: track.videoId,
    title: track.title,
    artist_name: track.artist ?? "",
    artist_id: track.artist_id ?? null,
    album_id: track.album_id ?? null,
    album_name: track.album ?? null,
    thumbnail: track.thumbnail ?? "",
    duration: track.duration ?? null,
    duration_seconds: track.duration_seconds ?? null,
  }));
}

/**
 * Mapea tracks genéricos (upNext, related) al formato estándar del reproductor
 * 
 * @param track - Track individual
 * @returns Canción en formato estándar
 */
export function mapGenericTrack(track: any): MappedSong {
  const trackId = track.track_id || track.id;
  const artistsArr = Array.isArray(track.artists) ? track.artists : [];

  const artist_name =
    track.artist_name ??
    (artistsArr.length ? artistsArr.map((a: any) => a.name).join(", ") : "Unknown");

  const artist_id =
    track.artist_id ??
    artistsArr[0]?.id ??
    null;

  const album_id =
    track.album_id ??
    track.album?.id ??
    null;

  const album_name =
    track.album_name ??
    track.album?.name ??
    null;

  return {
    id: trackId,
    title: track.title,
    artist_name,
    artist_id,
    artists: artistsArr,
    album_id,
    album_name,
    thumbnail: track.thumbnail,
    duration: track.duration || "--:--",
    duration_seconds: track.duration_seconds || null,
  };
}