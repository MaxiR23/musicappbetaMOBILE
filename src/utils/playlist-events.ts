// @/src/utils/playlist-events.ts
type Listener = () => void;

class PlaylistEventEmitter {
  private listeners: Listener[] = [];

  subscribe(callback: Listener) {
    this.listeners.push(callback);
    
    // Retorna función para desuscribir
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  emit() {
    this.listeners.forEach(listener => listener());
  }
}

const playlistEmitter = new PlaylistEventEmitter();

export const emitPlaylistChange = () => {
  console.log('📢 [EVENTS] Playlist changed');
  playlistEmitter.emit();
};

export const onPlaylistChange = (callback: () => void) => {
  return playlistEmitter.subscribe(callback);
};