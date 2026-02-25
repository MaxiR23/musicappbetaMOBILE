import { createContext } from "react";
import { Song } from "./../types/music";

type PlaySource =
  | { type: "playlist"; id?: string | null; name?: string | null }
  | { type: "album";    id?: string | null; name?: string | null }
  | { type: "artist";   id?: string | null; name?: string | null }
  | { type: "queue";    id?: string | null; name?: string | null }
  | { type: "related";  id: string;         name?: string | null }
  | { type: "search";   id: string;         name?: string | null };
export interface MusicContextType {
  currentSong: Song | null;
  setCurrentSong: (song: Song | null) => void;

  queue: Song[];
  queueIndex: number;
  playFromList: (list: Song[], startIndex: number, source?: PlaySource) => void;
  playFromRelated: (song: Song) => Promise<void>;
  playFromSearch: (song: Song) => Promise<void>;
  next: () => void;
  prev: () => void;
  skipToIndex: (index: number) => Promise<void>;
  shuffle: () => Promise<void>;
  isShuffled: boolean;
  playSource: PlaySource | null;

  originalQueueSize: number;
  initialQueueSize: number;
  addToQueueAndPlay: (song: Song) => Promise<void>;

  setAutoplayProvider: (provider: (() => Song | null) | null) => void;
  setIsAutoplayEnabledCallback: (callback: (() => boolean) | null) => void;
  isAutoplayEnabled: () => boolean;
}

export const MusicContext = createContext<MusicContextType | undefined>(undefined);