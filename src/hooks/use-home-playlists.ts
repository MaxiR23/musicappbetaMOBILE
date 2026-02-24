import { onPlaylistChange } from '@/src/utils/playlist-events';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCacheInvalidation } from './use-cache-invalidation';
import { useMusicApi } from './use-music-api';

export function useHomePlaylists(userId: string) {
  const [playlists, setPlaylists] = useState<any[]>([]);
  const { getPlaylists } = useMusicApi();
  const { invalidatePlaylists } = useCacheInvalidation(userId);

  const refreshPlaylists = useCallback(async (force = false) => {
    try {
      if (force) {
        await invalidatePlaylists();
      }

      const pls = await getPlaylists();
      setPlaylists(Array.isArray(pls) ? pls : []);
    } catch (e: any) {
      console.warn("[API] getPlaylists error:", e?.message || e);
      setPlaylists([]);
    }
  }, [getPlaylists, invalidatePlaylists]);

  //ref para evitar re-suscripciones
  const refreshRef = useRef(refreshPlaylists);
  refreshRef.current = refreshPlaylists;

  const playlistsWithCreate = useMemo(() => {
    return [{ id: '__create__', isCreateButton: true }, ...playlists];
  }, [playlists]);

  const ready = !!userId;

  useEffect(() => {
    if (!ready) return;
    refreshRef.current();
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    
    const unsubscribe = onPlaylistChange(() => {
      refreshRef.current(true);
    });
    
    return unsubscribe;
  }, [ready]);  

  return {
    playlists,
    playlistsWithCreate,
    refreshPlaylists,
  };
}