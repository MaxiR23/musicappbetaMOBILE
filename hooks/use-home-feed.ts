import { fetchFeed } from '@/services/feedService';
import { musicService } from '@/services/musicService';
import { fetchRecommendations } from '@/services/recommendService';
import { cacheWrap, DAY_MS } from '@/utils/cache';
import { MappedSong } from '@/utils/song-mapper';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCacheVersions } from './use-cache-versions';

export function useHomeFeed(userId: string) {
  const { versions } = useCacheVersions();

  const [newReleases, setNewReleases] = useState<any[]>([]);
  const [topAlbums, setTopAlbums] = useState<any[]>([]);
  const [topTracks, setTopTracks] = useState<any[]>([]);
  // const [newSingles, setNewSingles] = useState<any[]>([]); // temporalmente deshabilitado
  const [seedTracks, setSeedTracks] = useState<any[]>([]);
  const [recoArtists, setRecoArtists] = useState<any[]>([]);
  const [recoAlbums, setRecoAlbums] = useState<any[]>([]);
  const [upcomingReleases, setUpcomingReleases] = useState<any[]>([]);
  const [listenAgainAlbum, setListenAgainAlbum] = useState<any>(null);
  const [featuredRelease, setFeaturedRelease] = useState<any>(null);
  const [recommendedPlaylists, setRecommendedPlaylists] = useState<any[]>([]);
  const [replaySongs, setReplaySongs] = useState<MappedSong[]>([]);
  const [replayLoading, setReplayLoading] = useState(true);
  const [feedReady, setFeedReady] = useState(false);

  const [userStations, setUserStations] = useState<any[]>([]);

  // -- Ref estable para userId y versions (evita recrear callbacks) --
  const ctxRef = useRef({ userId, versions });
  ctxRef.current = { userId, versions };

  const fetchFns = useRef({
    refreshNewReleases: async () => {
      const { versions } = ctxRef.current;
      try {
        const resp = await musicService.getNewReleases(versions);
        setNewReleases(resp?.releases ?? []);
        setFeedReady(true);
      } catch (e: any) {
        console.warn('[useHomeFeed] new_releases error:', e?.message || e);
        setNewReleases([]);
        setFeedReady(true);
      }
    },

    refreshTopAlbums: async () => {
      const { userId, versions } = ctxRef.current;
      try {
        const albums = await cacheWrap(
          'home:feed:most_played:albums:20:v1',
          () => fetchFeed({ kind: 'most_played', type: 'album', limit: 20 }),
          { userId, ttl: DAY_MS, version: versions['top-albums'] }
        );
        setTopAlbums(albums);
      } catch (e: any) {
        console.warn('[useHomeFeed] most_played/albums error:', e?.message || e);
        setTopAlbums([]);
      }
    },

    refreshTopTracks: async () => {
      const { userId, versions } = ctxRef.current;
      try {
        const tracks = await cacheWrap(
          'home:feed:most_played:tracks:20:v1',
          () => fetchFeed({ kind: 'most_played', type: 'track', limit: 20 }),
          { userId, ttl: DAY_MS, version: versions['top-tracks'] }
        );
        setTopTracks(tracks);
      } catch (e: any) {
        console.warn('[useHomeFeed] most_played/tracks error:', e?.message || e);
        setTopTracks([]);
      }
    },

    // --- refreshNewSingles (temporalmente deshabilitado) ---
    // refreshNewSingles: async () => {
    //   const { userId, versions } = ctxRef.current;
    //   try {
    //     const tracks = await cacheWrap(
    //       'home:feed:new_singles:tracks:20:v1',
    //       () => fetchFeed({ kind: 'new_singles', type: 'track', limit: 20 }),
    //       { userId, ttl: DAY_MS, version: versions['new-singles'] }
    //     );
    //     setNewSingles(tracks);
    //   } catch (e: any) {
    //     console.warn('[useHomeFeed] new_singles error:', e?.message || e);
    //     setNewSingles([]);
    //   }
    // },

    refreshSeedTracks: async () => {
      const { userId, versions } = ctxRef.current;
      try {
        const tracks = await cacheWrap(
          'home:feed:seed_tracks:tracks:20:v1',
          () => fetchFeed({ kind: 'seed_tracks', type: 'track', limit: 20 }),
          { userId, ttl: DAY_MS, version: versions['seed-tracks'] }
        );
        setSeedTracks(tracks);
      } catch (e: any) {
        console.warn('[useHomeFeed] seed_tracks error:', e?.message || e);
        setSeedTracks([]);
      }
    },

    refreshRecommendations: async () => {
      const { userId, versions } = ctxRef.current;
      try {
        const data = await cacheWrap(
          'home:recommendations:v1',
          () => fetchRecommendations(),
          { userId, ttl: DAY_MS, version: versions['user-recommendations'] }
        );
        setRecoArtists(Array.isArray(data.artists) ? data.artists : []);
        setRecoAlbums(Array.isArray(data.albums) ? data.albums : []);
      } catch (e: any) {
        console.warn('[useHomeFeed] recommendations error:', e?.message || e);
        setRecoArtists([]);
        setRecoAlbums([]);
      }
    },

    refreshUpcomingReleases: async () => {
      const { versions } = ctxRef.current;
      try {
        const resp = await musicService.getUpcomingReleases(versions);
        setUpcomingReleases(resp?.releases ?? []);
      } catch (e: any) {
        console.warn('[useHomeFeed] upcoming_releases error:', e?.message || e);
        setUpcomingReleases([]);
      }
    },

    refreshListenAgain: async () => {
      const { versions } = ctxRef.current;
      try {
        const resp = await musicService.getListenAgain(versions);
        setListenAgainAlbum(resp?.album ?? null);
      } catch (e: any) {
        console.warn('[useHomeFeed] listen_again error:', e?.message || e);
        setListenAgainAlbum(null);
      }
    },

    refreshFeaturedRelease: async () => {
      const { versions } = ctxRef.current;
      try {
        const resp = await musicService.getFeaturedRelease(versions);
        setFeaturedRelease(resp?.featured ?? null);
      } catch (e: any) {
        console.warn('[useHomeFeed] featured_release error:', e?.message || e);
        setFeaturedRelease(null);
      }
    },

    refreshReplay: async () => {
      const { versions } = ctxRef.current;
      try {
        const resp = await musicService.getReplaySongs(versions);
        setReplaySongs(resp || []);
      } catch (e: any) {
        console.warn('[useHomeFeed] replay error:', e?.message || e);
        setReplaySongs([]);
      } finally {
        setReplayLoading(false);
      }
    },

    refreshRecommendedPlaylists: async () => {
      const { versions } = ctxRef.current;
      try {
        const resp = await musicService.getRecommendedPlaylists(versions);
        setRecommendedPlaylists(resp?.playlists ?? []);
      } catch (e: any) {
        console.warn('[useHomeFeed] recommended_playlists error:', e?.message || e);
        setRecommendedPlaylists([]);
      }
    },

    refreshUserStations: async () => {
      const { versions } = ctxRef.current;
      try {
        const resp = await musicService.getUserStations(versions);
        setUserStations(resp?.stations ?? []);
      } catch (e: any) {
        console.warn('[useHomeFeed] user_stations error:', e?.message || e);
        setUserStations([]);
      }
    },
  });

  const recoBySeed = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const a of recoArtists || []) {
      const sid = a?.similar_to?.id || '__no_seed__';
      if (!map.has(sid)) map.set(sid, []);
      map.get(sid)!.push(a);
    }
    return Array.from(map.entries());
  }, [recoArtists]);

  // Solo dispara cuando userId esta listo Y versions fueron cargadas
  const ready = !!userId && Object.keys(versions).length > 0;

  useEffect(() => {
    if (!ready) return;

    const fns = fetchFns.current;
    const timer = setTimeout(() => {
      fns.refreshNewReleases();
      fns.refreshTopAlbums();
      fns.refreshTopTracks();
      // fns.refreshNewSingles(); // temporalmente deshabilitado
      fns.refreshSeedTracks();
      fns.refreshRecommendations();
      fns.refreshUpcomingReleases();
      fns.refreshListenAgain();
      fns.refreshFeaturedRelease();
      fns.refreshReplay();
      fns.refreshRecommendedPlaylists();
      fns.refreshUserStations();
    }, 100);

    return () => clearTimeout(timer);
  }, [ready]);

  return {
    newReleases,
    topAlbums,
    topTracks,
    // newSingles, // temporalmente deshabilitado
    seedTracks,
    recoArtists,
    recoAlbums,
    recoBySeed,
    upcomingReleases,
    listenAgainAlbum,
    featuredRelease,
    replaySongs,
    recommendedPlaylists,
    userStations,
    replayLoading,
    feedReady,
  };
}