import { useEffect, useRef } from "react";
import { Song } from "../types/music";
import { getUpgradedThumb } from "../utils/image-helpers";
import { mapGenericTrack } from "../utils/song-mapper";

interface UseAutoplayManagerParams {
  currentSong: Song | null;
  playSource: any;
  autoplayEnabled: boolean;
  shouldShowRelated: boolean;
  upNextData: any;
  fetchUpNext: () => void;
  fetchRelated: () => void;
  setAutoplayProvider: (provider: (() => Song | null) | null) => void;
  setAutoplayEnabled: (callback: (() => boolean) | null) => void;
  autoplayStartIndex: number;
  queueLength: number;
  queueIds: Set<string>;
}

export function useAutoplayManager(params: UseAutoplayManagerParams) {
  const {
    currentSong,
    playSource,
    autoplayEnabled,
    shouldShowRelated,
    upNextData,
    fetchUpNext,
    fetchRelated,
    setAutoplayProvider,
    setAutoplayEnabled,
    autoplayStartIndex,
    queueLength,
    queueIds,
  } = params;

  const autoplayIndexRef = useRef(0);
  const manuallyPlayedAutoplayIds = useRef<Set<string>>(new Set());
  const upNextByContextRef = useRef<any>(null);
  const currentPlaySourceIdRef = useRef<string | null>(null);
  const isFetchingUpNextRef = useRef(false);
  const lastFetchedContextRef = useRef<string | null>(null);

  // Mantener queueIds actualizado en ref para uso dentro del provider
  const queueIdsRef = useRef(queueIds);
  useEffect(() => {
    queueIdsRef.current = queueIds;
  }, [queueIds]);

  useEffect(() => {
    let contextId: string | null = null;

    if (playSource?.type === 'related') {
      contextId = playSource.id ? `related:${playSource.id}` : null;
    } else if (playSource?.type) {
      contextId = `${playSource.type}:${playSource.id ?? playSource.name ?? ''}`;
    }

    if (contextId && contextId !== currentPlaySourceIdRef.current) {
      currentPlaySourceIdRef.current = contextId;
      upNextByContextRef.current = null;
      autoplayIndexRef.current = 0;
      manuallyPlayedAutoplayIds.current.clear();
      lastFetchedContextRef.current = null;
    }

    if (currentSong?.id && contextId && contextId !== lastFetchedContextRef.current && !isFetchingUpNextRef.current) {
      lastFetchedContextRef.current = contextId;
      isFetchingUpNextRef.current = true;
      fetchUpNext();
    }
  }, [playSource?.type, playSource?.id, currentSong?.id, fetchUpNext]);

  useEffect(() => {
    if (upNextData && !upNextByContextRef.current) {
      upNextByContextRef.current = upNextData;
      isFetchingUpNextRef.current = false;
    }
  }, [upNextData]);

  useEffect(() => {
    if (currentSong?.id && shouldShowRelated) {
      fetchRelated();
    }
  }, [currentSong?.id, shouldShowRelated, fetchRelated]);

  useEffect(() => {
    if (currentSong?.id && playSource?.type === 'related' && !upNextByContextRef.current && !isFetchingUpNextRef.current) {
      console.log('Nueva cancion en Related detectada, cargando autoplay fresco');
      isFetchingUpNextRef.current = true;
      fetchUpNext();
    }
  }, [currentSong?.id, playSource?.type, fetchUpNext]);

  useEffect(() => {
    const provider = () => {
      if (!autoplayEnabled) return null;

      const contextUpNext = upNextByContextRef.current;
      const autoplayTracks = contextUpNext?.up_next;

      if (!autoplayTracks || autoplayTracks.length <= 1) return null;

      const availableTracks = autoplayTracks.slice(1);

      while (autoplayIndexRef.current < availableTracks.length) {
        const track = availableTracks[autoplayIndexRef.current];
        const trackId = track.track_id || track.id;

        autoplayIndexRef.current += 1;

        // Ya fue reproducida manualmente
        if (manuallyPlayedAutoplayIds.current.has(trackId)) {
          continue;
        }

        // Ya esta en la cola actual
        if (queueIdsRef.current.has(String(trackId))) {
          continue;
        }

        const mappedTrack = mapGenericTrack(track);
        return {
          ...mappedTrack,
          thumbnail: getUpgradedThumb(track, 256) || mappedTrack.thumbnail,
        } as Song;
      }

      return null;
    };

    setAutoplayProvider(provider);
    setAutoplayEnabled(() => autoplayEnabled);

    return () => {
      setAutoplayProvider(null);
      setAutoplayEnabled(null);
    };
  }, [autoplayEnabled, setAutoplayProvider, setAutoplayEnabled]);

  const contextUpNext = upNextByContextRef.current;
  const autoplayTracksAvailable = contextUpNext?.up_next && contextUpNext.up_next.length > 1
    ? contextUpNext.up_next.length - 1
    : 0;

  const autoplayTracksUsed = queueLength - autoplayStartIndex;
  const hasMoreAutoplay = autoplayTracksUsed < autoplayTracksAvailable;

  return {
    hasMoreAutoplay,
    markAsManuallyPlayed: (trackId: string) => {
      manuallyPlayedAutoplayIds.current.add(trackId);
    },
    resetAutoplay: () => {
      upNextByContextRef.current = null;
      autoplayIndexRef.current = 0;
      manuallyPlayedAutoplayIds.current.clear();
    },
  };
}