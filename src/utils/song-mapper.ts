// src/utils/song-mapper.ts

/**
 * Interface para el formato estándar de una canción mapeada
 * Este es el formato que espera el reproductor
 */
export interface MappedSong {
  id: string;
  title: string;
  artistName: string;
  artistId: string | null;
  artists?: any[];
  albumName?: string | null;
  albumId?: string | null;
  thumbnail?: string;
  duration?: string | null;
  durationSeconds?: number | null;
  url?: string;
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
  albumId?: string | null;
  
  /**
   * ID del artista (para canciones de artista)
   */
  artistId?: string | null;

  /**
   * Nombre del álbum por defecto
   */
  albumName?: string | null;
  
  /**
   * Nombre del artista por defecto
   */
  defaultArtistName?: string;
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
  const { defaultThumbnail, albumId, albumName } = options;
  
  return tracks.map((track: any) => {
    const artists = Array.isArray(track.artists) ? track.artists : [];
    const primary = artists[0] || null;
    
    const artistName = 
      track.artistName ?? 
      (artists.length ? artists.map((a: any) => a.name).join(", ") : "");
    
    const artistId = 
      track.artistId ?? 
      (primary && primary.id ? primary.id : null);
    
    const trackId = track.videoId || track.id;
    
    return {
      id: trackId,
      title: track.title,
      artistName,
      artistId,
      artists,
      albumId: albumId ?? null,
      albumName: albumName ?? null,
      duration: track.duration || null,
      durationSeconds: track.durationSeconds || null,
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
  const { artistId, defaultArtistName } = options;
  
  return topSongs.map((song: any) => {
    const artistsArr = Array.isArray(song.artists) ? song.artists : [];
    const primary = artistsArr[0] || null;
    
    const artistName = 
      song.artistName ?? 
      (artistsArr.length 
        ? artistsArr.map((a: any) => a.name).join(", ") 
        : defaultArtistName || "");
    
    const resolvedArtistId = 
      song.artistId ?? 
      primary?.id ?? 
      artistId ?? 
      null;
    
    const trackId = song.videoId ?? song.id;
    const albumId = song.albumId ?? song.album?.id ?? null;
    
    return {
      id: trackId,
      title: song.title,
      thumbnail: song.thumbnail,
      duration: song.duration,
      durationSeconds: song.durationSeconds,
      artistName,
      artistId: resolvedArtistId,
      artists: artistsArr,
      albumId,
      url: "",
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
  return playlistSongs.map((song: any) => ({
    id: song.id,
    internalId: song.internalId,
    title: song.title,
    artistName: song.artist,
    artistId: song.artistId ?? null,
    albumId: song.albumId ?? null,
    thumbnail: song.albumCover,
    duration: song.duration,
    durationSeconds: null,
    url: "",
  }));
}

/**
 * Mapea tracks genéricos (upNext, related) al formato estándar del reproductor
 * 
 * @param track - Track individual
 * @returns Canción en formato estándar
 */
export function mapGenericTrack(track: any): MappedSong {
  const trackId = track.videoId || track.id;
  const artistsArr = Array.isArray(track.artists) ? track.artists : [];
  
  const artistName = 
    track.artistName ?? 
    (artistsArr.length ? artistsArr.map((a: any) => a.name).join(", ") : "Unknown");
  
  const artistId = 
    track.artistId ?? 
    artistsArr[0]?.id ?? 
    null;
  
  const albumId = 
    track.albumId ?? 
    track.album?.id ?? 
    null;
  
  const albumName = 
    track.albumName ?? 
    track.album?.name ?? 
    null;
  
  return {
    id: trackId,
    title: track.title,
    artistName,
    artistId,
    artists: artistsArr,
    albumId,
    albumName,
    thumbnail: track.thumbnail,
    duration: track.duration || "--:--",
    durationSeconds: track.durationSeconds || null,
  };
}