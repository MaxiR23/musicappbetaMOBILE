import { LikeInput } from "@/context/LikesContext";
import { useCallback, useState } from "react";
import { useLikes, } from "./use-likes";

interface UseTrackLikesParams {
  currentSong: any;
}

/**
 * Hook para manejar el estado de like/unlike del track actual.
 * Usa LikesProvider (Set en memoria + SQLite + backend).
 * El corazon responde instantaneo via optimistic update del provider.
 */
export function useTrackLikes({ currentSong }: UseTrackLikesParams) {
  const { isLiked: checkLiked, toggleLike: providerToggle } = useLikes();
  const [liking, setLiking] = useState(false);

  const trackId = currentSong?.id ? String(currentSong.id) : null;
  const isLiked = trackId ? checkLiked(trackId) : false;

  const toggleLike = useCallback(async () => {
    if (!currentSong || !trackId || liking) return;
    setLiking(true);

    try {
      const input: LikeInput = {
        track_id: trackId,
        title: currentSong.title ?? "",
        artist: currentSong.artist_name ?? "",
        artist_id: currentSong.artist_id ?? "",
        album: currentSong.album_name ?? "",
        album_id: currentSong.album_id ?? "",
        thumbnail_url: currentSong.thumbnail ?? "",
        duration_seconds: currentSong.duration_seconds ?? 0,
      };

      await providerToggle(input);
    } catch (err) {
      console.warn("[useTrackLikes] toggleLike failed:", err);
    } finally {
      setLiking(false);
    }
  }, [currentSong, trackId, liking, providerToggle]);

  return {
    isLiked,
    liking,
    toggleLike,
  };
}