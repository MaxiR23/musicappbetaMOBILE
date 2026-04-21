import { createContext } from "react";

export interface PlaylistsContextValue {
  playlists: any[];
  playlistsWithCreate: any[];
  refreshPlaylists: (force?: boolean) => Promise<void>;
}

export const PlaylistsContext = createContext<PlaylistsContextValue | null>(null);