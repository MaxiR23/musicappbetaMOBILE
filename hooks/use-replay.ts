import { useMusicApi } from "@/hooks/use-music-api";
import { MappedSong } from "@/utils/song-mapper";
import { useEffect, useState } from "react";

export function useReplay() {
  const { getReplaySongs } = useMusicApi();
  const [songs, setSongs] = useState<MappedSong[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getReplaySongs()
      .then((data) => setSongs(data || []))
      .catch(() => setSongs([]))
      .finally(() => setLoading(false));
  }, [getReplaySongs]);

  return { songs, loading };
}