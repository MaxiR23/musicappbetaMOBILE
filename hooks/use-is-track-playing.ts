import { useMusic } from "./use-music";

export function useIsTrackPlaying(trackId: string | number) {
  const { currentSong, isPlaying } = useMusic();

  const isCurrentTrack = currentSong && trackId
    ? String(currentSong.id) === String(trackId)
    : false;

  return {
    isCurrentTrack,
    isPlaying: isCurrentTrack && isPlaying,
  };
}