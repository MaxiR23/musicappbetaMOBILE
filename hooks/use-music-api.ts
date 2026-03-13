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
    (album_id: string, source?: { name?: string | null; thumb?: string | null }) =>
      musicService.logPlayAlbum(album_id, source),
    []
  );

  const logPlayArtist = useCallback(
    (artist_id: string, source?: { name?: string | null; thumb?: string | null }) =>
      musicService.logPlayArtist(artist_id, source),
    []
  );

  const logPlayTrack = useCallback(
    (trackId: string, context?: {
      album_id?: string;
      album_name?: string;
      artist_id?: string;
      track_name?: string;
      artist_name?: string;
      duration_seconds?: number;
      thumbnail_url?: string;
    }) => musicService.logPlayTrack(trackId, context),
    []
  );

  const logPlayPlaylist = useCallback(
    (playlistId: string, source?: { name?: string | null; thumb?: string | null }) =>
      musicService.logPlayPlaylist(playlistId, source),
    []
  );

  // ==================== STATS ====================
  const getWeeklyStats = useCallback(
    (options?: { include?: string; limit?: number }) =>
      musicService.getWeeklyStats(options),
    []
  );

  const getMonthlyStats = useCallback(
    (options?: { include?: string; limit?: number }) =>
      musicService.getMonthlyStats(options),
    []
  );

  // ==================== LIKES ==================== (coming soon)

  // ==================== OTHER ====================

  const getRecentPlays = useCallback(
    (limit = 20) => musicService.getRecentPlays(limit),
    []
  );

  const getReplaySongs = useCallback(
    () => musicService.getReplaySongs(),
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
    logPlayTrack,
    logPlayPlaylist,
    getWeeklyStats,
    getMonthlyStats,
    getRecentPlays,
    getReplaySongs,
    moveTrackInPlaylist,
    getTrackLyrics,
    getTrackUpNext,
    getTrackRelated,
  };
}