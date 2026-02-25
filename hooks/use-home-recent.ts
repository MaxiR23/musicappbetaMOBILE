import { cacheGet, cacheSet } from '@/utils/cache';
import { subscribeToRecentChanges } from '@/utils/recent-events';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMusicApi } from './use-music-api';

type RecentItem = {
  type: "album" | "artist" | "playlist";
  id: string;
  played_at: string;
  name?: string | null;
  thumbnail_url?: string | null;
};

const CACHE_KEY = 'home:recent:plays:12:v1';

export function useHomeRecent(userId: string, _currentSongId?: string) {
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const { getRecentPlays } = useMusicApi();
  
  const fetchingRef = useRef(false);

  const fetchRecent = useCallback(async (forceBypassCache = false) => {
    if (!userId || fetchingRef.current) return;

    try {
      fetchingRef.current = true;

      // 1. Si NO es bypass, intenta leer de caché
      if (!forceBypassCache) {
        const cached = await cacheGet<RecentItem[]>(CACHE_KEY, { userId });
        if (cached && Array.isArray(cached)) {
          setRecent(cached);
          fetchingRef.current = false;
          return;
        }
      }

      // 2. Fetch (si no hay caché o es bypass)
      setRecentLoading(true);
      const resp = await getRecentPlays(12);
      const items = resp?.items ?? [];

      // 3. Guarda en caché (indefinido, hasta invalidación manual)
      await cacheSet(CACHE_KEY, items, { userId });
      
      setRecent(items);
    } catch (e: any) {
      console.warn("[HOME] getRecentPlays error:", e?.message || e);
      setRecent([]);
    } finally {
      setRecentLoading(false);
      fetchingRef.current = false;
    }
  }, [getRecentPlays, userId]);

  const recentVisible = useMemo(
    () =>
      (recent || [])
        .filter((it) => Boolean(it.name) || Boolean(it.thumbnail_url))
        .slice(0, 12),
    [recent]
  );

  useEffect(() => {
    if (!userId) return;
    fetchRecent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    const unsubscribe = subscribeToRecentChanges(() => {
      setTimeout(() => {
        console.log('[HOME] refetching recientes (bypass cache)...');
        fetchRecent(true);
      }, 3000);
    });

    return unsubscribe;
  }, [fetchRecent]);

  return {
    recent,
    recentVisible,
    recentLoading,
    refreshRecent: fetchRecent,
  };
}