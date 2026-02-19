import { useEffect, useState } from "react";
interface UseTrackLikesParams {
  currentSong: any;
  likeTrack: (id: string) => Promise<any>;
  unlikeTrack: (id: string) => Promise<any>;
  isTrackLiked: (id: string) => Promise<any>;
}

/**
 * Hook para manejar el estado de like/unlike de un track
 * Sincroniza con el API y maneja estados de carga
 */
export function useTrackLikes({
  currentSong,
  likeTrack,
  unlikeTrack,
  isTrackLiked,
}: UseTrackLikesParams) {
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [liking, setLiking] = useState<boolean>(false);

  // Función helper para obtener el estado inicial del like desde el objeto currentSong
  const getInitialLikedState = () => {
    return (
      Boolean((currentSong as any)?.liked) ||
      Boolean((currentSong as any)?.is_liked) ||
      Boolean((currentSong as any)?.extra?.liked)
    );
  };

  // Sincronizar estado de liked cuando cambia la canción
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const id = currentSong?.id ? String(currentSong.id) : null;
      
      // Si no hay ID o no hay función para verificar, usar estado inicial
      if (!id || !isTrackLiked) {
        const init = getInitialLikedState();
        if (!cancelled) setIsLiked(init);
        return;
      }

      // Intentar obtener estado desde el API
      try {
        const resp = await isTrackLiked(id);
        if (!cancelled) setIsLiked(Boolean(resp?.liked));
      } catch {
        // En caso de error, usar estado inicial del objeto
        const init = getInitialLikedState();
        if (!cancelled) setIsLiked(init);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentSong?.id, isTrackLiked]);

  // Toggle like/unlike con optimistic update
  const toggleLike = async () => {
    if (!currentSong?.id || liking) return;

    const id = String(currentSong.id);
    const next = !isLiked;

    // Optimistic update
    setIsLiked(next);
    setLiking(true);

    try {
      if (next) {
        await likeTrack(id);
      } else {
        await unlikeTrack(id);
      }
    } catch (e) {
      // Revertir en caso de error
      setIsLiked(!next);
      console.warn("like/unlike failed:", e);
    } finally {
      setLiking(false);
    }
  };

  return {
    isLiked,
    liking,
    toggleLike,
  };
}