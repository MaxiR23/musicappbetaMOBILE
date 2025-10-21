// src/hooks/use-is-track-playing.ts
import { State, usePlaybackState } from "react-native-track-player";
import { useMusic } from "./use-music";

/**
 * Hook que determina si un track específico está sonando actualmente
 * @param trackId - ID del track a verificar
 * @returns objeto con isCurrentTrack y isPlaying
 */
export function useIsTrackPlaying(trackId: string | number) {
  const { currentSong } = useMusic();
  const playbackState = usePlaybackState();
  
  const isCurrentTrack = currentSong && trackId 
    ? String(currentSong.id) === String(trackId)
    : false;

  // Determinar si está realmente reproduciendo (no pausado/detenido)
  const isActuallyPlaying = 
    playbackState.state === State.Playing || 
    playbackState.state === State.Buffering;

  return {
    isCurrentTrack,
    isPlaying: isCurrentTrack && isActuallyPlaying,
  };
}