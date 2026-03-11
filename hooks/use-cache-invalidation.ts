import { cacheClearPrefix, cacheDel } from '@/utils/cache';
import { emitRecentChange } from '@/utils/recent-events';
import { useCallback } from 'react';

export function useCacheInvalidation(userId?: string) {

  const invalidatePlaylists = useCallback(async () => {
    //DBG: console.log('[invalidate] playlists');
    await cacheDel('home:playlists:v1', userId);
    await cacheDel('playlists:list');
  }, [userId]);

  const invalidateRecent = useCallback(async () => {
    //DBG: console.log('[invalidate] recent plays');
    await cacheDel('home:recent:plays:12:v1', userId);

    //notifica a los listeners de "recents" para que refresquen su data (sin acoplarlos a este hook).
    emitRecentChange();
  }, [userId]);

  const invalidateFeed = useCallback(async () => {
    //DBG: console.log('[invalidate] feed');
    await cacheClearPrefix('home:feed:');
  }, []);

  const invalidateRecommendations = useCallback(async () => {
    //DBG: console.log('[invalidate] recommendations');
    await cacheClearPrefix('home:recommendations:');
  }, []);

  return {
    invalidatePlaylists,
    invalidateRecent,
    invalidateFeed,
    invalidateRecommendations,
  };
}