import { syncWithTrackPlayer } from '../../services/syncWithTrackPlayer';
import TrackPlayer, {
    getMockState,
    resetMockState,
} from '../__mocks__/react-native-track-player';

jest.mock('../../services/setupTrackPlayer', () => ({
  ensureTrackPlayer: jest.fn().mockResolvedValue(undefined),
}));

// Helpers
const createMockSong = (id: string, title: string) => ({
  id,
  title,
  artist_name: 'Test Artist',
  album_id: 'album_1',
  album_name: 'Test Album',
  thumbnail: 'http://example.com/thumb.jpg',
});

const createMockAlbum = (trackCount: number) =>
  Array.from({ length: trackCount }, (_, i) =>
    createMockSong(`track_${i + 1}`, `Track ${i + 1}`)
  );

const BASE_URL = 'http://localhost:3000';

describe('syncWithTrackPlayer - función real', () => {
  let syncingRef: { current: boolean };

  beforeEach(() => {
    resetMockState();
    syncingRef = { current: false };
  });

  test('usa load() en lugar de reset()', async () => {
    const tracks = createMockAlbum(5);

    await syncWithTrackPlayer(tracks, 0, BASE_URL, syncingRef);

    expect(TrackPlayer.load).toHaveBeenCalledTimes(1);
    expect(TrackPlayer.reset).not.toHaveBeenCalled();
  });

  test('carga el track correcto según startIndex', async () => {
    const tracks = createMockAlbum(5);

    await syncWithTrackPlayer(tracks, 2, BASE_URL, syncingRef);

    expect(TrackPlayer.load).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'track_3',
        title: 'Track 3',
      })
    );
  });

  test('arma la cola completa en orden correcto', async () => {
    const tracks = createMockAlbum(5);

    await syncWithTrackPlayer(tracks, 2, BASE_URL, syncingRef);

    const state = getMockState();
    expect(state.queue).toHaveLength(5);
    expect(state.queue.map((t: any) => t.id)).toEqual([
      'track_1', 'track_2', 'track_3', 'track_4', 'track_5'
    ]);
  });

  test('llama play() al final', async () => {
    const tracks = createMockAlbum(3);

    await syncWithTrackPlayer(tracks, 0, BASE_URL, syncingRef);

    expect(TrackPlayer.play).toHaveBeenCalledTimes(1);
  });

  test('syncingRef queda en false al final', async () => {
    const tracks = createMockAlbum(3);

    await syncWithTrackPlayer(tracks, 0, BASE_URL, syncingRef);

    expect(syncingRef.current).toBe(false);
  });

  test('syncingRef queda en false incluso si hay error', async () => {
    (TrackPlayer.load as jest.Mock).mockRejectedValueOnce(new Error('Test error'));

    const tracks = createMockAlbum(3);

    await expect(syncWithTrackPlayer(tracks, 0, BASE_URL, syncingRef)).rejects.toThrow('Test error');
    expect(syncingRef.current).toBe(false);
  });
});

describe('syncWithTrackPlayer - edge cases', () => {
  let syncingRef: { current: boolean };

  beforeEach(() => {
    resetMockState();
    syncingRef = { current: false };
  });

  test('álbum de 1 sola canción', async () => {
    const tracks = createMockAlbum(1);

    await syncWithTrackPlayer(tracks, 0, BASE_URL, syncingRef);

    const state = getMockState();
    expect(state.queue).toHaveLength(1);
  });

  test('startIndex negativo se clampea a 0', async () => {
    const tracks = createMockAlbum(5);

    await syncWithTrackPlayer(tracks, -5, BASE_URL, syncingRef);

    expect(TrackPlayer.load).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'track_1' })
    );
  });

  test('startIndex mayor al length se clampea al último', async () => {
    const tracks = createMockAlbum(5);

    await syncWithTrackPlayer(tracks, 100, BASE_URL, syncingRef);

    expect(TrackPlayer.load).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'track_5' })
    );
  });

  test('lista vacía no hace nada', async () => {
    await syncWithTrackPlayer([], 0, BASE_URL, syncingRef);

    expect(TrackPlayer.load).not.toHaveBeenCalled();
  });

  test('baseUrl vacío no hace nada', async () => {
    const tracks = createMockAlbum(5);

    await syncWithTrackPlayer(tracks, 0, '', syncingRef);

    expect(TrackPlayer.load).not.toHaveBeenCalled();
  });
});

describe('syncWithTrackPlayer - cambio de contexto', () => {
  let syncingRef: { current: boolean };

  beforeEach(() => {
    resetMockState();
    syncingRef = { current: false };
  });

  test('cambiar de álbum reemplaza toda la cola', async () => {
    const album1 = createMockAlbum(3);
    await syncWithTrackPlayer(album1, 0, BASE_URL, syncingRef);

    const album2 = [
      createMockSong('new_1', 'New Track 1'),
      createMockSong('new_2', 'New Track 2'),
    ];
    await syncWithTrackPlayer(album2, 0, BASE_URL, syncingRef);

    const state = getMockState();
    expect(state.queue).toHaveLength(2);
    expect(state.queue[0].id).toBe('new_1');
    expect(state.queue[1].id).toBe('new_2');
  });

  test('no quedan tracks del álbum anterior', async () => {
    const album1 = [
      createMockSong('old_1', 'Old 1'),
      createMockSong('old_2', 'Old 2'),
    ];
    await syncWithTrackPlayer(album1, 0, BASE_URL, syncingRef);

    const album2 = [
      createMockSong('new_1', 'New 1'),
      createMockSong('new_2', 'New 2'),
    ];
    await syncWithTrackPlayer(album2, 0, BASE_URL, syncingRef);

    const state = getMockState();
    const hasOldTracks = state.queue.some((t: any) => t.id.startsWith('old_'));
    expect(hasOldTracks).toBe(false);
  });
});

describe('syncWithTrackPlayer - URLs', () => {
  let syncingRef: { current: boolean };

  beforeEach(() => {
    resetMockState();
    syncingRef = { current: false };
  });

  test('URL tiene formato correcto', async () => {
    const tracks = createMockAlbum(1);

    await syncWithTrackPlayer(tracks, 0, BASE_URL, syncingRef);

    expect(TrackPlayer.load).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'http://localhost:3000/music/play?id=track_1&redir=2',
      })
    );
  });

  test('caracteres especiales se encodean', async () => {
    const tracks = [createMockSong('track&with=special', 'Special')];

    await syncWithTrackPlayer(tracks, 0, BASE_URL, syncingRef);

    expect(TrackPlayer.load).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'http://localhost:3000/music/play?id=track%26with%3Dspecial&redir=2',
      })
    );
  });
});