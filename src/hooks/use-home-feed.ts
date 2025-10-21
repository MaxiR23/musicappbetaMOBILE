// hooks/use-home-feed.ts
import { fetchFeed } from '@/src/services/feedService';
import { fetchRecommendations } from '@/src/services/recommendService';
import { cacheWrap, DAY_MS } from '@/src/utils/cache';
import { useCallback, useEffect, useMemo, useState } from 'react';

export function useHomeFeed(userId: string) {
  const [newReleases, setNewReleases] = useState<any[]>([]);
  const [topAlbums, setTopAlbums] = useState<any[]>([]);
  const [topTracks, setTopTracks] = useState<any[]>([]);
  const [newSingles, setNewSingles] = useState<any[]>([]);
  const [seedTracks, setSeedTracks] = useState<any[]>([]);
  const [recoArtists, setRecoArtists] = useState<any[]>([]);
  const [recoAlbums, setRecoAlbums] = useState<any[]>([]);

  const refreshNewReleases = useCallback(async () => {
    try {
      const albums = await cacheWrap(
        `home:feed:new_releases:AR:albums:20:v1`,
        () => fetchFeed({ kind: "new_releases", type: "album", store: "AR", limit: 20 }),
        { userId, ttl: DAY_MS }
      );
      setNewReleases(albums);
    } catch (e: any) {
      console.warn("[API] new_releases error:", e?.message || e);
      setNewReleases([]);
    }
  }, [userId]);

  const refreshTopAlbums = useCallback(async () => {
    try {
      const albums = await cacheWrap(
        `home:feed:most_played:albums:20:v1`,
        () => fetchFeed({ kind: "most_played", type: "album", limit: 20 }),
        { userId, ttl: DAY_MS }
      );
      setTopAlbums(albums);
    } catch (e: any) {
      console.warn("[API] most_played/albums error:", e?.message || e);
      setTopAlbums([]);
    }
  }, [userId]);

  const refreshTopTracks = useCallback(async () => {
    try {
      const tracks = await cacheWrap(
        `home:feed:most_played:tracks:20:v1`,
        () => fetchFeed({ kind: "most_played", type: "track", limit: 20 }),
        { userId, ttl: DAY_MS }
      );
      setTopTracks(tracks);
    } catch (e: any) {
      console.warn("[API] most_played/tracks error:", e?.message || e);
      setTopTracks([]);
    }
  }, [userId]);

  const refreshNewSingles = useCallback(async () => {
    try {
      const tracks = await cacheWrap(
        `home:feed:new_singles:tracks:20:v1`,
        () => fetchFeed({ kind: "new_singles", type: "track", limit: 20 }),
        { userId, ttl: DAY_MS }
      );
      setNewSingles(tracks);
    } catch (e: any) {
      console.warn("[API] new_singles error:", e?.message || e);
      setNewSingles([]);
    }
  }, [userId]);

  const refreshSeedTracks = useCallback(async () => {
    try {
      const tracks = await cacheWrap(
        `home:feed:seed_tracks:tracks:20:v1`,
        () => fetchFeed({ kind: "seed_tracks", type: "track", limit: 20 }),
        { userId, ttl: DAY_MS }
      );
      setSeedTracks(tracks);
    } catch (e: any) {
      console.warn("[API] seed_tracks error:", e?.message || e);
      setSeedTracks([]);
    }
  }, [userId]);

  const refreshRecommendations = useCallback(async () => {
    try {
      const data = await cacheWrap(
        `home:recommendations:weekly_2025w41:v1`,
        () => fetchRecommendations("weekly_2025w41"),
        { userId, ttl: DAY_MS }
      );
      setRecoArtists(Array.isArray(data.artists) ? data.artists : []);
      setRecoAlbums(Array.isArray(data.albums) ? data.albums : []);
    } catch (e: any) {
      console.warn("[API] recommendations error:", e?.message || e);
      setRecoArtists([]);
      setRecoAlbums([]);
    }
  }, [userId]);

  const recoBySeed = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const a of recoArtists || []) {
      const sid = a?.similarTo?.id || "__no_seed__";
      if (!map.has(sid)) map.set(sid, []);
      map.get(sid)!.push(a);
    }
    return Array.from(map.entries());
  }, [recoArtists]);

  const ready = !!userId;

  // Carga secundaria con delay
  useEffect(() => {
    if (!ready) return;

    const timer = setTimeout(() => {
      refreshNewReleases();
      refreshTopAlbums();
      refreshTopTracks();
      refreshNewSingles();
      refreshSeedTracks();
      refreshRecommendations();
    }, 100);

    return () => clearTimeout(timer);
  }, [ready, refreshNewReleases, refreshTopAlbums, refreshTopTracks, refreshNewSingles, refreshSeedTracks, refreshRecommendations]);

  return {
    newReleases,
    topAlbums,
    topTracks,
    newSingles,
    seedTracks,
    recoArtists,
    recoAlbums,
    recoBySeed,
  };
}