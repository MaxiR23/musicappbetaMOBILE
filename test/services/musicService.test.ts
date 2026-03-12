/**
 * test/services/musicService.test.ts
 * Tests unitarios de musicService.getArtist() - TypeScript
 */

import { musicService } from '../../services/musicService';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null } })),
    },
  },
}));

jest.mock('@/utils/cache', () => ({
  cacheWrap: jest.fn((key, fn, options) => fn()),
  cacheClearPrefix: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/utils/music-helpers', () => ({
  toTrackPayload: jest.fn(),
}));

jest.mock('@/utils/playlist-events', () => ({
  emitPlaylistChange: jest.fn(),
}));

jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      EXPO_PUBLIC_API_URL: 'http://192.168.1.7:8001/api',
    },
  },
}));

global.fetch = jest.fn();

describe('musicService.getArtist()', () => {
  const CORRECT_IDS = {
    'Travis Scott': 'UCf_gP4AMRSgAfyzbkeS9k4g',
    'Bad Bunny': 'UCiY3z8HAGD6BlSNKVn2kSvQ',
    'The Weeknd': 'UClYV6hHlupm_S_ObS1W-DYw',
    'Drake': 'UCU6cE7pdJPc6DU2jSrKEsdQ',
  };

  const BASE_URL = 'http://34.39.241.17:8000/api';
  const versions = { artist: 'v-20260309' };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  const mockArtistResponse = (name: string) => ({
    header: {
      name,
      description: `Bio de ${name}`,
      thumbnails: [
        { url: 'http://example.com/image.jpg', width: 226, height: 226 },
      ],
    },
    top_songs: [
      { id: 'song_1', title: 'Top Song 1', artist_name: name },
      { id: 'song_2', title: 'Top Song 2', artist_name: name },
      { id: 'song_3', title: 'Top Song 3', artist_name: name },
      { id: 'song_4', title: 'Top Song 4', artist_name: name },
      { id: 'song_5', title: 'Top Song 5', artist_name: name },
    ],
    albums: [
      { id: 'album_1', title: 'Album 1', year: '2024' },
      { id: 'album_2', title: 'Album 2', year: '2023' },
    ],
    singles_eps: [
      { id: 'single_1', title: 'Single 1', year: '2024' },
    ],
    has_more: { albums: false, singles: false },
    related: [
      { id: 'artist_1', name: 'Related Artist 1' },
      { id: 'artist_2', name: 'Related Artist 2' },
    ],
    upcoming_events: [],
  });

  test('getArtist - Travis Scott OK', async () => {
    const artistId = CORRECT_IDS['Travis Scott'];
    const mockResponse = mockArtistResponse('Travis Scott');

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      json: () => Promise.resolve(mockResponse),
      text: () => Promise.resolve(''),
    });

    const result = await musicService.getArtist(artistId, versions);

    expect(result).toBeDefined();
    expect(result.header.name).toBe('Travis Scott');
    expect(result.top_songs).toHaveLength(5);
    expect(result.albums).toHaveLength(2);
    expect(result.singles_eps).toHaveLength(1);
    expect(result.related).toHaveLength(2);
  });

  test('getArtist - Bad Bunny OK', async () => {
    const artistId = CORRECT_IDS['Bad Bunny'];
    const mockResponse = mockArtistResponse('Bad Bunny');

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      headers: new Map([['content-type', 'application/json']]),
      json: () => Promise.resolve(mockResponse),
      text: () => Promise.resolve(''),
    });

    const result = await musicService.getArtist(artistId, versions);

    expect(result.header.name).toBe('Bad Bunny');
    expect(result.top_songs.length).toBeGreaterThan(0);
  });

  test('getArtist - The Weeknd OK', async () => {
    const artistId = CORRECT_IDS['The Weeknd'];
    const mockResponse = mockArtistResponse('The Weeknd');

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      headers: new Map([['content-type', 'application/json']]),
      json: () => Promise.resolve(mockResponse),
      text: () => Promise.resolve(''),
    });

    const result = await musicService.getArtist(artistId, versions);

    expect(result.header.name).toBe('The Weeknd');
    expect(result.top_songs).toBeDefined();
  });

  test('getArtist - Drake OK', async () => {
    const artistId = CORRECT_IDS['Drake'];
    const mockResponse = mockArtistResponse('Drake');

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      headers: new Map([['content-type', 'application/json']]),
      json: () => Promise.resolve(mockResponse),
      text: () => Promise.resolve(''),
    });

    const result = await musicService.getArtist(artistId, versions);

    expect(result.header.name).toBe('Drake');
    expect(result.top_songs.length).toBeGreaterThan(0);
  });

  test('debería hacer fetch al endpoint correcto', async () => {
    const artistId = CORRECT_IDS['Travis Scott'];
    const mockResponse = mockArtistResponse('Travis Scott');

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      headers: new Map([['content-type', 'application/json']]),
      json: () => Promise.resolve(mockResponse),
      text: () => Promise.resolve(''),
    });

    await musicService.getArtist(artistId, versions);

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain(`/music/artist/${artistId}`);
  });

  test('debería lanzar error si header está vacío', async () => {
    const artistId = CORRECT_IDS['Travis Scott'];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      headers: new Map([['content-type', 'application/json']]),
      json: () => Promise.resolve({ header: null, top_songs: [] }),
      text: () => Promise.resolve(''),
    });

    await expect(
      musicService.getArtist(artistId, versions)
    ).rejects.toThrow();
  });

  test('debería encodear correctamente el artist ID', async () => {
    const artistId = CORRECT_IDS['Travis Scott'];
    const mockResponse = mockArtistResponse('Travis Scott');

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      headers: new Map([['content-type', 'application/json']]),
      json: () => Promise.resolve(mockResponse),
      text: () => Promise.resolve(''),
    });

    await musicService.getArtist(artistId, versions);

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain(encodeURIComponent(artistId));
  });

  test('debería manejar respuesta 502', async () => {
    const artistId = CORRECT_IDS['Travis Scott'];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      text: () => Promise.resolve(''),
    });

    await expect(
      musicService.getArtist(artistId, versions)
    ).rejects.toThrow();
  });

  test('debería devolver estructura completa del artist', async () => {
    const artistId = CORRECT_IDS['Bad Bunny'];
    const mockResponse = mockArtistResponse('Bad Bunny');

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      headers: new Map([['content-type', 'application/json']]),
      json: () => Promise.resolve(mockResponse),
      text: () => Promise.resolve(''),
    });

    const result = await musicService.getArtist(artistId, versions);

    expect(result).toHaveProperty('header');
    expect(result).toHaveProperty('top_songs');
    expect(result).toHaveProperty('albums');
    expect(result).toHaveProperty('singles_eps');
    expect(result).toHaveProperty('has_more');
    expect(result).toHaveProperty('related');
    expect(result).toHaveProperty('upcoming_events');
  });
});