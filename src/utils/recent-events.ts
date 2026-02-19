type RecentListener = () => void;

const listeners: RecentListener[] = [];

export function subscribeToRecentChanges(cb: RecentListener): () => void {
  listeners.push(cb);
  return () => {
    const idx = listeners.indexOf(cb);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

export function emitRecentChange(): void {
  listeners.forEach((cb) => cb());
}