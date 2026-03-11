export const mockQueue: any[] = [];
let mockCurrentTrack: any = null;
let mockCurrentIndex = 0;

const TrackPlayer = {
  setupPlayer: jest.fn().mockResolvedValue(undefined),
  updateOptions: jest.fn().mockResolvedValue(undefined),
  registerPlaybackService: jest.fn(),
  
  load: jest.fn().mockImplementation(async (track) => {
    mockCurrentTrack = track;
    mockCurrentIndex = 0;
    // load() agrega el track a la cola (puede haber tracks viejos)
    mockQueue.unshift(track);
  }),
  
  add: jest.fn().mockImplementation(async (tracks, insertBeforeIndex?: number) => {
    const tracksArray = Array.isArray(tracks) ? tracks : [tracks];
    if (insertBeforeIndex !== undefined) {
      mockQueue.splice(insertBeforeIndex, 0, ...tracksArray);
      if (insertBeforeIndex <= mockCurrentIndex) {
        mockCurrentIndex += tracksArray.length;
      }
    } else {
      mockQueue.push(...tracksArray);
    }
  }),
  
  remove: jest.fn().mockImplementation(async (index: number) => {
    if (index >= 0 && index < mockQueue.length) {
      mockQueue.splice(index, 1);
      if (index < mockCurrentIndex) {
        mockCurrentIndex--;
      } else if (index === mockCurrentIndex && mockCurrentIndex >= mockQueue.length) {
        mockCurrentIndex = Math.max(0, mockQueue.length - 1);
      }
    }
  }),
  
  removeUpcomingTracks: jest.fn().mockImplementation(async () => {
    mockQueue.splice(mockCurrentIndex + 1);
  }),
  
  reset: jest.fn().mockImplementation(async () => {
    mockQueue.length = 0;
    mockCurrentTrack = null;
    mockCurrentIndex = 0;
  }),
  
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
  seekTo: jest.fn().mockResolvedValue(undefined),
  
  skip: jest.fn().mockImplementation(async (index: number) => {
    mockCurrentIndex = index;
    mockCurrentTrack = mockQueue[index] || null;
  }),
  
  skipToNext: jest.fn().mockImplementation(async () => {
    if (mockCurrentIndex < mockQueue.length - 1) {
      mockCurrentIndex++;
      mockCurrentTrack = mockQueue[mockCurrentIndex];
    }
  }),
  
  skipToPrevious: jest.fn().mockImplementation(async () => {
    if (mockCurrentIndex > 0) {
      mockCurrentIndex--;
      mockCurrentTrack = mockQueue[mockCurrentIndex];
    }
  }),
  
  getQueue: jest.fn().mockImplementation(async () => [...mockQueue]),
  getActiveTrack: jest.fn().mockImplementation(async () => mockCurrentTrack),
  getActiveTrackIndex: jest.fn().mockImplementation(async () => mockCurrentIndex),
  getPosition: jest.fn().mockResolvedValue(0),
  getDuration: jest.fn().mockResolvedValue(180),
  getBufferedPosition: jest.fn().mockResolvedValue(30),
  setRepeatMode: jest.fn().mockResolvedValue(undefined),
  
  addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
};

export const Event = {
  PlaybackState: 'playback-state',
  PlaybackError: 'playback-error',
  PlaybackActiveTrackChanged: 'playback-active-track-changed',
  PlaybackQueueEnded: 'playback-queue-ended',
  PlaybackProgressUpdated: 'playback-progress-updated',
  RemotePlay: 'remote-play',
  RemotePause: 'remote-pause',
  RemoteNext: 'remote-next',
  RemotePrevious: 'remote-previous',
  RemoteSeek: 'remote-seek',
};

export const RepeatMode = {
  Off: 0,
  Track: 1,
  Queue: 2,
};

export const TrackType = {
  Default: 'default',
};

export const resetMockState = () => {
  mockQueue.length = 0;
  mockCurrentTrack = null;
  mockCurrentIndex = 0;
  jest.clearAllMocks();
};

export const getMockState = () => ({
  queue: [...mockQueue],
  currentTrack: mockCurrentTrack,
  currentIndex: mockCurrentIndex,
});

export default TrackPlayer;