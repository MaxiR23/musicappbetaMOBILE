import { LibraryViewContext } from "@/context/LibraryViewContext";
import { useContext } from "react";

/**
 * Hook para acceder a la biblioteca unificada del usuario.
 *
 * Expone la grilla unificada (liked + playlists propias + saved albums/playlists),
 * slices derivados por tipo, y las mutaciones sobre saved items.
 *
 * Los datos se cargan en el boot via LibraryViewProvider y se mantienen
 * sincronizados a traves de:
 *   - onPlaylistChange (create/edit/delete de playlists)
 *   - AppState "active" (refresh al volver de background)
 *   - Invalidacion de cache en mutaciones (add/remove, like/unlike, etc.)
 */
export function useLibraryView() {
  const ctx = useContext(LibraryViewContext);
  if (!ctx) {
    throw new Error("useLibraryView must be used within <LibraryViewProvider>");
  }
  return ctx;
}