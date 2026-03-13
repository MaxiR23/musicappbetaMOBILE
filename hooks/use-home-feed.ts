import { fetchFeed } from '@/services/feedService';
// import { fetchRecommendations } from '@/services/recommendService'; // TODO: fix 502
import { cacheWrap, DAY_MS } from '@/utils/cache';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from './use-auth';
import { useCacheVersions } from './use-cache-versions';

export function useHomeFeed(userId: string) {
  const { versions } = useCacheVersions();
  const { fetchWithAuth } = useAuth();

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
        { userId, ttl: DAY_MS, version: versions['new-releases'] }
      );
      setNewReleases(albums);
    } catch (e: any) {
      console.warn("[useHomeFeed] new_releases error:", e?.message || e);
      setNewReleases([]);
    }
  }, [userId, versions]);

  const refreshTopAlbums = useCallback(async () => {
    try {
      const albums = await cacheWrap(
        `home:feed:most_played:albums:20:v1`,
        () => fetchFeed({ kind: "most_played", type: "album", limit: 20 }),
        { userId, ttl: DAY_MS, version: versions['top-albums'] }
      );
      setTopAlbums(albums);
    } catch (e: any) {
      console.warn("[API] most_played/albums error:", e?.message || e);
      setTopAlbums([]);
    }
  }, [userId, versions]);

  const refreshTopTracks = useCallback(async () => {
    try {
      const tracks = await cacheWrap(
        `home:feed:most_played:tracks:20:v1`,
        () => fetchFeed({ kind: "most_played", type: "track", limit: 20 }),
        { userId, ttl: DAY_MS, version: versions['top-tracks'] }
      );
      setTopTracks(tracks);
    } catch (e: any) {
      console.warn("[API] most_played/tracks error:", e?.message || e);
      setTopTracks([]);
    }
  }, [userId, versions]);

  const refreshNewSingles = useCallback(async () => {
    try {
      const tracks = await cacheWrap(
        `home:feed:new_singles:tracks:20:v1`,
        () => fetchFeed({ kind: "new_singles", type: "track", limit: 20 }),
        { userId, ttl: DAY_MS, version: versions['new-singles'] }
      );
      setNewSingles(tracks);
    } catch (e: any) {
      console.warn("[API] new_singles error:", e?.message || e);
      setNewSingles([]);
    }
  }, [userId, versions]);

  const refreshSeedTracks = useCallback(async () => {
    try {
      const tracks = await cacheWrap(
        `home:feed:seed_tracks:tracks:20:v1`,
        () => fetchFeed({ kind: "seed_tracks", type: "track", limit: 20 }),
        { userId, ttl: DAY_MS, version: versions['seed-tracks'] }
      );
      setSeedTracks(tracks);
    } catch (e: any) {
      console.warn("[API] seed_tracks error:", e?.message || e);
      setSeedTracks([]);
    }
  }, [userId, versions]);

  // TODO: fix 502 — deshabilitado temporalmente
  // const refreshRecommendations = useCallback(async () => {
  //   try {
  //     const data = await cacheWrap(
  //       `home:recommendations:v1`,
  //       () => fetchRecommendations(),
  //       { userId, ttl: DAY_MS, version: versions['user-recommendations'] }
  //     );
  //     setRecoArtists(Array.isArray(data.artists) ? data.artists : []);
  //     setRecoAlbums(Array.isArray(data.albums) ? data.albums : []);
  //   } catch (e: any) {
  //     console.warn("[API] recommendations error:", e?.message || e);
  //     setRecoArtists([]);
  //     setRecoAlbums([]);
  //   }
  // }, [userId, versions]);

  const recoBySeed = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const a of recoArtists || []) {
      const sid = a?.similar_to?.id || "__no_seed__";
      if (!map.has(sid)) map.set(sid, []);
      map.get(sid)!.push(a);
    }
    return Array.from(map.entries());
  }, [recoArtists]);

  const ready = !!userId;

  useEffect(() => {
    if (!ready) return;

    const timer = setTimeout(() => {
      refreshNewReleases();
      refreshTopAlbums();
      refreshTopTracks();
      refreshNewSingles();
      refreshSeedTracks();
      // refreshRecommendations(); // TODO: fix 502
    }, 100);

    return () => clearTimeout(timer);
  }, [ready, refreshNewReleases, refreshTopAlbums, refreshTopTracks, refreshNewSingles, refreshSeedTracks]);

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