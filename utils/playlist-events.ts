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
  //DBG: console.log('[EVENTS] emitPlaylistChange called, listeners:', playlistEmitter.listeners.length);
  playlistEmitter.emit();
};

export const onPlaylistChange = (callback: () => void) => {
  //DBG: console.log('[EVENTS] onPlaylistChange subscribed');
  return playlistEmitter.subscribe(callback);
};