import { LibraryKind, LibraryViewItem } from "@/services/libraryService";
import { createContext } from "react";

// input para agregar items saved (album o playlist de terceros).
// mismo shape que tenia el LibraryContext viejo.
export interface LibraryAddInput {
  kind: LibraryKind;
  external_id: string;
  title: string;
  thumbnail_url?: string;
  artist?: string;
  artist_id?: string;
  album_id?: string;
  album_name?: string;
}

export interface LibraryViewContextType {
  // grilla unificada tal cual viene del backend, ya ordenada.
  viewItems: LibraryViewItem[];
  isReady: boolean;

  // slices derivados para lugares que siguen necesitando filtrar por tipo.
  ownedPlaylists: LibraryViewItem[];   // kind === "own_playlist"
  savedAlbums: LibraryViewItem[];      // kind === "saved_album"
  savedPlaylists: LibraryViewItem[];   // kind === "saved_playlist"

  // queries: "este album/playlist esta en mi library?"
  // solo aplica a saved items (albums y playlists de terceros).
  isInLibrary: (kind: LibraryKind, externalId: string) => boolean;

  // mutations sobre saved items.
  addToLibrary: (input: LibraryAddInput) => Promise<void>;
  removeFromLibrary: (kind: LibraryKind, externalId: string) => Promise<void>;

  // refresh manual (pull-to-refresh, foreground, etc).
  refresh: () => Promise<void>;
}

export const LibraryViewContext = createContext<LibraryViewContextType | undefined>(undefined);