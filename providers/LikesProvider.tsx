import { LikeInput, LikesContext } from "@/context/LikesContext";
import { useAuth } from "@/hooks/use-auth";
import { getAllLikes, getLikedTrackIds, LikedTrackRow } from "@/lib/likesDb";
import { likesService } from "@/services/likesService";
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";

export function LikesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [likedTracks, setLikedTracks] = useState<LikedTrackRow[]>([]);
  const [isReady, setIsReady] = useState(false);

  const syncingRef = useRef(false);
  const likedIdsRef = useRef(likedIds);
  likedIdsRef.current = likedIds;

  // -- LOAD LOCAL (instantaneo, sin red) --
  useEffect(() => {
    if (!userId) {
      setLikedIds(new Set());
      setLikedTracks([]);
      setIsReady(false);
      return;
    }

    let cancelled = false;

    async function loadLocal() {
      try {
        const ids = await getLikedTrackIds();
        const tracks = await getAllLikes();
        if (cancelled) return;
        setLikedIds(ids);
        setLikedTracks(tracks);
        setIsReady(true);
      } catch (err) {
        console.warn("[LikesProvider] loadLocal failed:", err);
        if (!cancelled) setIsReady(true);
      }
    }

    loadLocal();
    return () => { cancelled = true; };
  }, [userId]);

  // -- BACKGROUND SYNC (estable, sin deps inestables) --
  const runSync = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;

    try {
      await likesService.sync();
      const ids = await getLikedTrackIds();
      const tracks = await getAllLikes();
      setLikedIds(ids);
      setLikedTracks(tracks);
    } catch (err) {
      console.warn("[LikesProvider] sync failed:", err);
    } finally {
      syncingRef.current = false;
    }
  }, []);

  // Sync al montar (despues del load local)
  useEffect(() => {
    if (!isReady || !userId) return;
    runSync();
  }, [isReady, userId, runSync]);

  // Sync al volver de background
  useEffect(() => {
    if (!userId) return;

    function handleAppState(nextState: AppStateStatus) {
      if (nextState === "active") {
        runSync();
      }
    }

    const sub = AppState.addEventListener("change", handleAppState);
    return () => sub.remove();
  }, [userId, runSync]);

  // -- TOGGLE LIKE (estable, lee likedIds desde ref) --
  const toggleLike = useCallback(
    async (track: LikeInput) => {
      const trackId = track.track_id;
      const wasLiked = likedIdsRef.current.has(trackId);

      // 1. Optimistic update (instantaneo)
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (wasLiked) {
          next.delete(trackId);
        } else {
          next.add(trackId);
        }
        return next;
      });

      // 2. SQLite + backend (background)
      try {
        if (wasLiked) {
          await likesService.unlike(trackId);
        } else {
          await likesService.like(track);
        }

        // Refresh likedTracks desde SQLite
        const tracks = await getAllLikes();
        setLikedTracks(tracks);
      } catch (err) {
        console.warn("[LikesProvider] toggleLike failed, rolling back:", err);

        // Rollback optimistic update
        setLikedIds((prev) => {
          const next = new Set(prev);
          if (wasLiked) {
            next.add(trackId);
          } else {
            next.delete(trackId);
          }
          return next;
        });
      }
    },
    [],
  );

  // -- IS LIKED --
  const isLiked = useCallback(
    (trackId: string) => likedIds.has(trackId),
    [likedIds],
  );

  const value = useMemo(
    () => ({
      likedIds,
      isLiked,
      toggleLike,
      likedTracks,
      isReady,
    }),
    [likedIds, isLiked, toggleLike, likedTracks, isReady],
  );

  return (
    <LikesContext.Provider value={value}>{children}</LikesContext.Provider>
  );
}