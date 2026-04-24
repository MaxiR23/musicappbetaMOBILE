export interface Artist {
  header: {
    name: string;
    description: string;
    thumbnails: { url: string; width: number; height: number }[];
  };
  top_songs: TopSong[];
  albums: Album[];
  singles_eps?: Single[];
  related: RelatedArtist[];
  new_releases?: NewRelease[];
  upcoming_album?: any;
  upcoming_events?: any[];
  has_more?: {
    albums?: boolean;
    singles?: boolean;
  };
}
export interface TopSong {
  id: string;
  title: string;
  artist_name?: string | null;
  artist_id?: string | null;
  album_id?: string | null;
  duration?: string;
  duration_seconds?: number;
  thumbnail?: string | null;
}
export interface Album {
  id: string;
  title: string;
  year?: string;
  thumbnails: { url: string; width: number; height: number }[];
}
export interface Single {
  id: string;
  title: string;
  type?: string;
  year?: string;
  thumbnails: { url: string; width: number; height: number }[];
}
export interface RelatedArtist {
  id: string;
  name: string;
  subtitle: string;
  thumbnails: { url: string; width: number; height: number }[];
}
export interface Song {
  id: string;
  title: string;
  artist_name?: string | null;
  artist_id?: string;
  album_id?: string | null;
  album_name?: string;
  duration?: string;
  duration_seconds?: number;
  thumbnail: string;
  url?: string;
}
export interface AlbumDetails {
  id: string;
  info: {
    title: string;
    subtitle?: string;
    secondSubtitle?: string;
    description?: string;
    thumbnails: { url: string; width: number; height: number }[];
  };
  tracks: {
    id: string;
    title: string;
    duration?: string;
    duration_seconds?: number;
    playlistId?: string;
    artists: { id: string | null; name: string | null }[];
    artist_id: string | null;
    artist_name: string | null;
  }[];
  upcoming_events?: any[];  
  other_versions?: any[];   
  more_from_artist?: any[]; 
  releases_for_you?: any[]; 
}
export interface NewRelease {
  id: string;
  title: string;
  artist: string;
  artist_id?: string;
  thumb?: string | null;
  release_date?: string;
  track_count?: number | null;
  url?: string;
}