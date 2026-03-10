/**
 * test/hooks/useMusicApi.test.ts
 */

import { renderHook } from '@testing-library/react';
import { useMusicApi } from '../../hooks/use-music-api';
import * as musicServiceModule from '../../services/musicService';

jest.mock('../../services/musicService');

jest.mock('../../hooks/use-cache-versions', () => ({
  useCacheVersions: () => ({
    versions: { artist: 'v-20260309' },
  }),
}));

describe('useMusicApi - getArtist', () => {
  const CORRECT_IDS = {
    'Travis Scott': 'UCf_gP4AMRSgAfyzbkeS9k4g',
    'Bad Bunny': 'UCiY3z8HAGD6BlSNKVn2kSvQ',
    'The Weeknd': 'UClYV6hHlupm_S_ObS1W-DYw',
    'Drake': 'UCU6cE7pdJPc6DU2jSrKEsdQ',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockArtistData = (name: string) => ({
    header: {
      name,
      description: `Bio de ${name}`,
      thumbnails: [],
    },
    top_songs: [
      { id: 'song_1', title: 'Top Song 1' },
      { id: 'song_2', title: 'Top Song 2' },
    ],
    albums: [{ id: 'album_1', title: 'Album 1' }],
    singles_eps: [{ id: 'single_1', title: 'Single 1' }],
    has_more: { albums: false, singles: false },
    related: [],
    upcoming_events: [],
  });

  test('hook debería existir y devolver función getArtist', () => {
    const { result } = renderHook(() => useMusicApi());

    expect(result.current).toBeDefined();
    expect(result.current.getArtist).toBeDefined();
    expect(typeof result.current.getArtist).toBe('function');
  });

  test('getArtist debería llamar a musicService.getArtist', async () => {
    const artistId = CORRECT_IDS['Travis Scott'];
    const mockData = mockArtistData('Travis Scott');

    (musicServiceModule.musicService.getArtist as jest.Mock).mockResolvedValueOnce(mockData);

    const { result } = renderHook(() => useMusicApi());
    const artistData = await result.current.getArtist(artistId);

    expect(musicServiceModule.musicService.getArtist).toHaveBeenCalled();
    expect(artistData.header.name).toBe('Travis Scott');
  });

  test('getArtist - Travis Scott', async () => {
    const artistId = CORRECT_IDS['Travis Scott'];
    const mockData = mockArtistData('Travis Scott');

    (musicServiceModule.musicService.getArtist as jest.Mock).mockResolvedValueOnce(mockData);

    const { result } = renderHook(() => useMusicApi());
    const response = await result.current.getArtist(artistId);

    expect(response.header.name).toBe('Travis Scott');
    expect(response.top_songs).toHaveLength(2);
  });

  test('getArtist - Bad Bunny', async () => {
    const artistId = CORRECT_IDS['Bad Bunny'];
    const mockData = mockArtistData('Bad Bunny');

    (musicServiceModule.musicService.getArtist as jest.Mock).mockResolvedValueOnce(mockData);

    const { result } = renderHook(() => useMusicApi());
    const response = await result.current.getArtist(artistId);

    expect(response.header.name).toBe('Bad Bunny');
    expect(response.top_songs.length).toBeGreaterThan(0);
  });

  test('getArtist - The Weeknd', async () => {
    const artistId = CORRECT_IDS['The Weeknd'];
    const mockData = mockArtistData('The Weeknd');

    (musicServiceModule.musicService.getArtist as jest.Mock).mockResolvedValueOnce(mockData);

    const { result } = renderHook(() => useMusicApi());
    const response = await result.current.getArtist(artistId);

    expect(response.header.name).toBe('The Weeknd');
  });

  test('getArtist - Drake', async () => {
    const artistId = CORRECT_IDS['Drake'];
    const mockData = mockArtistData('Drake');

    (musicServiceModule.musicService.getArtist as jest.Mock).mockResolvedValueOnce(mockData);

    const { result } = renderHook(() => useMusicApi());
    const response = await result.current.getArtist(artistId);

    expect(response.header.name).toBe('Drake');
  });

  test('debería pasar versions correctamente', async () => {
    const artistId = CORRECT_IDS['Travis Scott'];
    const mockData = mockArtistData('Travis Scott');

    (musicServiceModule.musicService.getArtist as jest.Mock).mockResolvedValueOnce(mockData);

    const { result } = renderHook(() => useMusicApi());
    await result.current.getArtist(artistId);

    expect(musicServiceModule.musicService.getArtist).toHaveBeenCalledWith(
      artistId,
      expect.objectContaining({
        artist: expect.any(String),
      })
    );
  });

  test('debería devolver estructura completa del artist', async () => {
    const artistId = CORRECT_IDS['Bad Bunny'];
    const mockData = mockArtistData('Bad Bunny');

    (musicServiceModule.musicService.getArtist as jest.Mock).mockResolvedValueOnce(mockData);

    const { result } = renderHook(() => useMusicApi());
    const response = await result.current.getArtist(artistId);

    expect(response).toHaveProperty('header');
    expect(response).toHaveProperty('top_songs');
    expect(response).toHaveProperty('albums');
    expect(response).toHaveProperty('singles_eps');
  });

  test('debería manejar errores de manera correcta', async () => {
    const artistId = CORRECT_IDS['Travis Scott'];
    const error = new Error('Network error');

    (musicServiceModule.musicService.getArtist as jest.Mock).mockRejectedValueOnce(error);

    const { result } = renderHook(() => useMusicApi());

    await expect(result.current.getArtist(artistId)).rejects.toThrow('Network error');
  });

  test('hook debería devolver otros métodos también', () => {
    const { result } = renderHook(() => useMusicApi());

    const expectedMethods = [
      'searchSongs',
      'playSongUrl',
      'getReleases',
      'getArtist',
      'getAlbum',
      'getPlaylists',
      'getPlaylistById',
      'createPlaylist',
      'logPlayArtist',
      'logPlayTrack',
      'getWeeklyStats',
      'getMonthlyStats',
      'getRecentPlays',
      'getTrackLyrics',
    ];

    expectedMethods.forEach((method) => {
      expect((result.current as any)[method]).toBeDefined();
      expect(typeof (result.current as any)[method]).toBe('function');
    });
  });

  test('múltiples llamadas a getArtist deberían funcionar', async () => {
    (musicServiceModule.musicService.getArtist as jest.Mock)
      .mockResolvedValueOnce(mockArtistData('Travis Scott'))
      .mockResolvedValueOnce(mockArtistData('Bad Bunny'))
      .mockResolvedValueOnce(mockArtistData('The Weeknd'));

    const { result } = renderHook(() => useMusicApi());

    const artist1 = await result.current.getArtist(CORRECT_IDS['Travis Scott']);
    const artist2 = await result.current.getArtist(CORRECT_IDS['Bad Bunny']);
    const artist3 = await result.current.getArtist(CORRECT_IDS['The Weeknd']);

    expect(artist1.header.name).toBe('Travis Scott');
    expect(artist2.header.name).toBe('Bad Bunny');
    expect(artist3.header.name).toBe('The Weeknd');
    expect(musicServiceModule.musicService.getArtist).toHaveBeenCalledTimes(3);
  });
});