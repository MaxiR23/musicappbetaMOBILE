// hooks/use-track-metadata.ts
import { first } from "@/src/utils/data-helpers";
import { upgradeYtmImage } from "@/src/utils/ytmImage";
import { useMemo } from "react";

/**
 * Hook para extraer y normalizar metadatos de un track
 * Maneja múltiples formatos posibles de artistId, artistName, thumbnails, etc.
 */
export function useTrackMetadata(currentSong: any) {
  return useMemo(() => {
    if (!currentSong) {
      return {
        artistId: null,
        artistName: "",
        rawThumb: "",
        thumbUrl: "",
        coverUrl: "",
        bgUrl: "",
      };
    }

    // Extraer artist ID con múltiples fallbacks
    const artistId = first(
      currentSong?.artistId,
      currentSong?.artist_id,
      currentSong?.artists?.[0]?.id
    ) || null;

    // Extraer artist name con múltiples fallbacks
    const artistName = first(
      currentSong?.artistName,
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
      artistId,
      artistName,
      rawThumb,
      thumbUrl,
      coverUrl,
      bgUrl,
    };
  }, [currentSong]);
}