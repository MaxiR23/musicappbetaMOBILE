import { PlaylistsContext } from "@/context/PlaylistsContext";
import { useAuth } from "@/hooks/use-auth";
import { useCacheInvalidation } from "@/hooks/use-cache-invalidation";
import { useMusicApi } from "@/hooks/use-music-api";
import { onPlaylistChange } from "@/utils/playlist-events";
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

export function PlaylistsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [playlists, setPlaylists] = useState<any[]>([]);
  const { getPlaylists } = useMusicApi();
  const { invalidatePlaylists } = useCacheInvalidation(userId ?? undefined);

  const refreshPlaylists = useCallback(async (force = false) => {
    if (!userId) return;
    try {
      if (force) {
        await invalidatePlaylists();
      }
      const pls = await getPlaylists();
      setPlaylists(Array.isArray(pls) ? pls : []);
    } catch (e: any) {
      console.warn("[PlaylistsProvider] getPlaylists error:", e?.message || e);
      setPlaylists([]);
    }
  }, [userId, getPlaylists, invalidatePlaylists]);

  // Ref para evitar re-suscripciones en el effect de eventos
  const refreshRef = useRef(refreshPlaylists);
  refreshRef.current = refreshPlaylists;

  // Carga inicial al bootear (cuando userId está listo)
  useEffect(() => {
    if (!userId) {
      setPlaylists([]);
      return;
    }
    refreshRef.current();
  }, [userId]);

  // Listener de eventos de cambio (create, edit, delete, etc.)
  useEffect(() => {
    if (!userId) return;
    const unsubscribe = onPlaylistChange(() => {
      refreshRef.current(true);
    });
    return unsubscribe;
  }, [userId]);

  const playlistsWithCreate = useMemo(
    () => [{ id: "__create__", isCreateButton: true }, ...playlists],
    [playlists]
  );

  const value = useMemo(
    () => ({ playlists, playlistsWithCreate, refreshPlaylists }),
    [playlists, playlistsWithCreate, refreshPlaylists]
  );

  return (
    <PlaylistsContext.Provider value={value}>
      {children}
    </PlaylistsContext.Provider>
  );
}