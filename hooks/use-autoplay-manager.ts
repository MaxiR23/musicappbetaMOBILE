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
  setIsAutoplayEnabledCallback: (callback: (() => boolean) | null) => void;
  originalQueueSize: number;
  initialQueueSize: number;
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
    setIsAutoplayEnabledCallback,
    originalQueueSize,
    initialQueueSize,
  } = params;

  const autoplayIndexRef = useRef(0);
  const manuallyPlayedAutoplayIds = useRef<Set<string>>(new Set());
  const upNextByContextRef = useRef<any>(null);
  const currentPlaySourceIdRef = useRef<string | null>(null);
  const isFetchingUpNextRef = useRef(false);
  const lastFetchedContextRef = useRef<string | null>(null);

  useEffect(() => {
    let contextId: string | null = null;

    if (playSource?.type === 'related') {
      contextId = playSource.id ? `related:${playSource.id}` : null;
    } else if (playSource?.type) {
      contextId = `${playSource.type}:${playSource.id ?? playSource.name ?? ''}`;
    }

    if (contextId && contextId !== currentPlaySourceIdRef.current) {
      console.log('Contexto cambió, cargando nuevo autoplay:', contextId);
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
      console.log('Guardando upNext para este contexto');
      upNextByContextRef.current = upNextData;
      isFetchingUpNextRef.current = false;
    }
  }, [upNextData]);

  useEffect(() => {
    if (currentSong?.id && shouldShowRelated) {
      console.log('Canción cambió, recargando Related en background');
      fetchRelated();
    }
  }, [currentSong?.id, shouldShowRelated, fetchRelated]);

  useEffect(() => {
    if (currentSong?.id && playSource?.type === 'related' && !upNextByContextRef.current && !isFetchingUpNextRef.current) {
      console.log('Nueva canción en Related detectada, cargando autoplay fresco');
      isFetchingUpNextRef.current = true;
      fetchUpNext();
    }
  }, [currentSong?.id, playSource?.type, fetchUpNext]);

  useEffect(() => {
    const provider = () => {
      if (!autoplayEnabled) return null;

      const contextUpNext = upNextByContextRef.current;
      const autoplayTracks = contextUpNext?.upNext;

      if (!autoplayTracks || autoplayTracks.length <= 1) return null;

      const availableTracks = autoplayTracks.slice(1);

      while (autoplayIndexRef.current < availableTracks.length) {
        const track = availableTracks[autoplayIndexRef.current];
        const trackId = track.track_id || track.id;

        if (manuallyPlayedAutoplayIds.current.has(trackId)) {
          console.log(`Salteando "${track.title}" porque ya fue reproducida manualmente`);
          autoplayIndexRef.current += 1;
          continue;
        }

        autoplayIndexRef.current += 1;

        const mappedTrack = mapGenericTrack(track);
        return {
          ...mappedTrack,
          thumbnail: getUpgradedThumb(track, 256) || mappedTrack.thumbnail,
        } as Song;
      }

      return null;
    };

    setAutoplayProvider(provider);
    setIsAutoplayEnabledCallback(() => autoplayEnabled);

    return () => {
      setAutoplayProvider(null);
      setIsAutoplayEnabledCallback(null);
    };
  }, [autoplayEnabled, setAutoplayProvider, setIsAutoplayEnabledCallback]);

  const contextUpNext = upNextByContextRef.current;
  const autoplayTracksAvailable = contextUpNext?.upNext && contextUpNext.upNext.length > 1
    ? contextUpNext.upNext.length - 1
    : 0;

  const autoplayTracksUsed = originalQueueSize - initialQueueSize;
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