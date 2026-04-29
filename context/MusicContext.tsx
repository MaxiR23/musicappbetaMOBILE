import { createContext } from "react";
import { Song } from "./../types/music";

export type PlaySource =
  | { type: "playlist"; id?: string | null; name?: string | null; thumb?: string | null }
  | { type: "album"; id?: string | null; name?: string | null; thumb?: string | null; artist_name?: string | null }
  | { type: "artist";   id?: string | null; name?: string | null; thumb?: string | null }
  | { type: "queue";    id?: string | null; name?: string | null; thumb?: string | null }
  | { type: "related";  id: string;         name?: string | null; thumb?: string | null }
  | { type: "search";   id: string;         name?: string | null; thumb?: string | null }
  | { type: "station";  id: string;         name?: string | null; thumb?: string | null; station_artist_id?: string };

export interface MusicContextType {
  currentSong: Song | null;
  queue: Song[];
  queueIndex: number;
  playSource: PlaySource | null;
  isShuffled: boolean;
  autoplayStartIndex: number;
  playbackError: string | null;
  isPlaying: boolean;

  // playback
  playList: (list: Song[], index: number, source?: PlaySource) => Promise<void>;
  playSingle: (song: Song, source: PlaySource) => Promise<void>;
  next: () => Promise<void>;
  prev: () => Promise<void>;
  skipTo: (index: number) => Promise<void>;

  // queue 
  toggleShuffle: () => void;
  addToQueueAndPlay: (song: Song) => Promise<void>;

  // autoplay INFO: solo lo usa useAutoplayManager
  setAutoplayProvider: (fn: (() => Song | null) | null) => void;
  setAutoplayEnabled: (fn: (() => boolean) | null) => void;
}

export const MusicContext = createContext<MusicContextType | undefined>(undefined);