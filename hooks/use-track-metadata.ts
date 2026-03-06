import { first } from "@/utils/data-helpers";
import { upgradeYtmImage } from "@/utils/ytmImage";
import { useMemo } from "react";

/**
 * Hook para extraer y normalizar metadatos de un track
 * Maneja múltiples formatos posibles de artist_id, artist_name, thumbnails, etc.
 */
export function useTrackMetadata(currentSong: any) {
  return useMemo(() => {
    if (!currentSong) {
      return {
        artist_id: null,
        artist_name: "",
        rawThumb: "",
        thumbUrl: "",
        coverUrl: "",
        bgUrl: "",
      };
    }

    // Extraer artist ID con múltiples fallbacks
    const artist_id = first(
      currentSong?.artist_id,
      currentSong?.artist_id,
      currentSong?.artists?.[0]?.id
    ) || null;

    // Extraer artist name con múltiples fallbacks
    const artist_name = first(
      currentSong?.artist_name,
      currentSong?.artist,
      Array.isArray(currentSong?.artists)
        ? currentSong.artists.map((a: any) => a?.name).filter(Boolean).join(", ")
        : null
    ) || "";

    // Extraer thumbnail cruda con múltiples fallbacks
    const rawThumb = first(
      currentSong?.thumbnail,
      currentSong?.thumbnail_url,
      currentSong?.albumCover,
      currentSong?.thumbnails?.[0]?.url
    ) || "";

    // Generar URLs de diferentes tamaños
    const thumbUrl = upgradeYtmImage(rawThumb, 256) || rawThumb;
    const coverUrl = upgradeYtmImage(rawThumb, 600) || rawThumb;
    const bgUrl = upgradeYtmImage(rawThumb, 1200) || rawThumb;

    return {
      artist_id,
      artist_name,
      rawThumb,
      thumbUrl,
      coverUrl,
      bgUrl,
    };
  }, [currentSong]);
}