// hooks/use-music-api.ts
import { useCallback } from "react";
import { musicService } from "../services/musicService";
import { AlbumDetails, Artist, Song } from "../types/music";
import { useCacheVersions } from "./use-cache-versions";

export function useMusicApi() {
  const { versions } = useCacheVersions();

  // ==================== PUBLIC ====================
  
  const searchSongs = useCallback(
    (query: string): Promise<Song[]> => musicService.searchSongs(query),
    []
  );

  const playSongUrl = useCallback(
    (id: string): string => musicService.playSongUrl(id),
    []
  );

  const prefetchSongs = useCallback(
    (ids: string[]): Promise<void> => musicService.prefetchSongs(ids),
    []
  );

  const getReleases = useCallback(
    (): Promise<Song[]> => musicService.getReleases(),
    []
  );

  const getArtist = useCallback(
    (id: string): Promise<Artist> => musicService.getArtist(id, versions),
    [versions]
  );

  const getAlbum = useCallback(
    (id: string): Promise<AlbumDetails> => musicService.getAlbum(id, versions),
    [versions]
  );

  const getArtistAlbums = useCallback(
    (id: string) => musicService.getArtistAlbums(id, versions),
    [versions]
  );

  const getArtistSingles = useCallback(
    (id: string) => musicService.getArtistSingles(id, versions),
    [versions]
  );

  // ==================== GENRES ====================

  const getGenres = useCallback(
    () => musicService.getGenres(versions),
    [versions]
  );

  const getGenrePlaylists = useCallback(
    (slug: string, category?: string) => musicService.getGenrePlaylists(slug, versions, category),
    [versions]
  );

  const getGenreCategories = useCallback(
    (slug: string) => musicService.getGenreCategories(slug, versions),
    [versions]
  );

  const getGenrePlaylistTracks = useCallback(
    (playlistId: string, limit?: number) => musicService.getGenrePlaylistTracks(playlistId, versions, limit),
    [versions]
  );

  // ==================== PRIVATE (AUTH) ====================

  const getPlaylists = useCallback(
    () => musicService.getPlaylists(versions),
    [versions]
  );

  const getPlaylistById = useCallback(
    (id: string) => musicService.getPlaylistById(id, versions),
    [versions]
  );

  const createPlaylist = useCallback(
    (title: string, description?: string, is_public?: boolean) =>
      musicService.createPlaylist(title, description, is_public),
    []
  );

  const addTrackToPlaylist = useCallback(
    (playlistId: string, song: Song) => musicService.addTrackToPlaylist(playlistId, song),
    []
  );

  const deletePlaylist = useCallback(
    (playlistId: string) => musicService.deletePlaylist(playlistId),
    []
  );

  const removeTrackFromPlaylist = useCallback(
    (playlistId: string, trackId: string) => musicService.removeTrackFromPlaylist(playlistId, trackId),
    []
  );

  // ==================== PLAY LOGS ====================

  const logPlayAlbum = useCallback(
    (albumId: string, source?: { name?: string | null; thumb?: string | null }) =>
      musicService.logPlayAlbum(albumId, source),
    []
  );

  const logPlayArtist = useCallback(
    (artistId: string, source?: { name?: string | null; thumb?: string | null }) =>
      musicService.logPlayArtist(artistId, source),
    []
  );

  // ==================== LIKES ====================

  const likeTrack = useCallback((trackId: string) => musicService.likeTrack(trackId), []);
  const unlikeTrack = useCallback((trackId: string) => musicService.unlikeTrack(trackId), []);
  const likeAlbum = useCallback((albumId: string) => musicService.likeAlbum(albumId), []);
  const unlikeAlbum = useCallback((albumId: string) => musicService.unlikeAlbum(albumId), []);
  const likeArtist = useCallback((artistId: string) => musicService.likeArtist(artistId), []);
  const unlikeArtist = useCallback((artistId: string) => musicService.unlikeArtist(artistId), []);
  const likePlaylist = useCallback((playlistId: string) => musicService.likePlaylist(playlistId), []);
  const unlikePlaylist = useCallback((playlistId: string) => musicService.unlikePlaylist(playlistId), []);
  const isTrackLiked = useCallback((trackId: string) => musicService.isTrackLiked(trackId), []);

  // ==================== OTHER ====================

  const getRecentPlays = useCallback(
    (limit = 20) => musicService.getRecentPlays(limit),
    []
  );

  const moveTrackInPlaylist = useCallback(
    (playlistId: string, oldPosition: number, newPosition: number) =>
      musicService.moveTrackInPlaylist(playlistId, oldPosition, newPosition),
    []
  );

  const getTrackLyrics = useCallback(
    (trackId: string) => musicService.getTrackLyrics(trackId),
    []
  );

  const getTrackUpNext = useCallback(
    (trackId: string) => musicService.getTrackUpNext(trackId),
    []
  );

  const getTrackRelated = useCallback(
    (trackId: string) => musicService.getTrackRelated(trackId),
    []
  );

  return {
    searchSongs,
    playSongUrl,
    prefetchSongs,
    getReleases,
    getArtist,
    getAlbum,
    getArtistAlbums,
    getArtistSingles,
    getGenres,
    getGenrePlaylists,
    getGenreCategories,
    getGenrePlaylistTracks,
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
    getRecentPlays,
    moveTrackInPlaylist,
    getTrackLyrics,
    getTrackUpNext,
    getTrackRelated,
  };
}