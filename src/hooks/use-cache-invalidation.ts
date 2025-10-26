// hooks/use-cache-invalidation.ts 
import { cacheClearPrefix, cacheDel } from '@/src/utils/cache';
import { emitRecentChange } from '@/src/utils/recent-events';
import { useCallback } from 'react';

export function useCacheInvalidation(userId?: string) {

  const invalidatePlaylists = useCallback(async () => {
    console.log('[invalidate] playlists');
    await cacheDel('home:playlists:v1', userId);
    await cacheDel('playlists:list');
  }, [userId]);

  const invalidateRecent = useCallback(async () => {
    console.log('[invalidate] recent plays');
    await cacheDel('home:recent:plays:12:v1', userId);

    // emite evento para que hooks se enteren
    emitRecentChange();
  }, [userId]);

  const invalidateFeed = useCallback(async () => {
    console.log('[invalidate] feed');
    await cacheClearPrefix('home:feed:');
  }, []);

  const invalidateRecommendations = useCallback(async () => {
    console.log('[invalidate] recommendations');
    await cacheClearPrefix('home:recommendations:');
  }, []);

  return {
    invalidatePlaylists,
    invalidateRecent,
    invalidateFeed,
    invalidateRecommendations,
  };
}