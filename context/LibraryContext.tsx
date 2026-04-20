import { LibraryItem, LibraryKind } from "@/services/libraryService";
import { createContext } from "react";

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

export interface LibraryContextType {
  items: LibraryItem[];
  albums: LibraryItem[];
  playlists: LibraryItem[];
  isReady: boolean;

  // queries
  isInLibrary: (kind: LibraryKind, externalId: string) => boolean;

  // mutations
  addToLibrary: (input: LibraryAddInput) => Promise<void>;
  removeFromLibrary: (kind: LibraryKind, externalId: string) => Promise<void>;

  // refresh
  refresh: () => Promise<void>;
}

export const LibraryContext = createContext<LibraryContextType | undefined>(undefined);