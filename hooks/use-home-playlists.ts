import { PlaylistsContext } from "@/context/PlaylistsContext";
import { useContext } from "react";

/**
 * Hook to access user's own playlists.
 *
 * Data is loaded at app boot via PlaylistsProvider and kept in sync through
 * the playlist-events emitter (create, edit, delete actions emit automatically).
 *
 * The userId param is accepted for backwards compatibility but ignored —
 * the active user is resolved internally by the provider via useAuth.
 */
export function useHomePlaylists(_userId?: string | null) {
  const ctx = useContext(PlaylistsContext);
  if (!ctx) {
    throw new Error("useHomePlaylists must be used within <PlaylistsProvider>");
  }
  return ctx;
}