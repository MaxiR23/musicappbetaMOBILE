import { LikedTrackRow } from "@/lib/likesDb";
import { createContext } from "react";

export interface LikesContextType {
  likedIds: Set<string>;
  isLiked: (trackId: string) => boolean;
  toggleLike: (track: LikeInput) => Promise<void>;
  likedTracks: LikedTrackRow[];
  isReady: boolean;
}

export interface LikeInput {
  track_id: string;
  title: string;
  artists: { id: string | null; name: string }[];
  album: string;
  album_id: string;
  thumbnail_url: string;
  duration_seconds: number;
}

export const LikesContext = createContext<LikesContextType | undefined>(undefined);