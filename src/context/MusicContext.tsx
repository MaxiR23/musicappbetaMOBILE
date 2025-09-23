import { createContext } from "react";
import { Song } from "./../types/music";

type PlaySource =
  | { type: "playlist"; name?: string | null }
  | { type: "album"; name?: string | null }
  | { type: "artist"; name?: string | null }
  | { type: "queue"; name?: string | null };

export interface MusicContextType {
  currentSong: Song | null;
  setCurrentSong: (song: Song | null) => void;

  queue: Song[];
  queueIndex: number;
  playFromList: (list: Song[], startIndex: number, source?: PlaySource) => void;
  next: () => void;
  prev: () => void;
  playSource: PlaySource | null;
}

export const MusicContext = createContext<MusicContextType | undefined>(undefined);