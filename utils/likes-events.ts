type Listener = () => void;

const listeners = new Set<Listener>();

export function onLikesChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitLikesChange(): void {
  listeners.forEach((l) => {
    try {
      l();
    } catch (err) {
      console.warn("[likes-events] listener error:", err);
    }
  });
}