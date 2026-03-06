import { getUpgradedThumb, upgradeThumbUrl } from "@/utils/image-helpers";

/**
 * Retorna el primer valor que no sea undefined, null o string vacío
 */
export const first = (...vals: any[]) => 
  vals.find(v => v !== undefined && v !== null && v !== "");

/**
 * Convierte formato MM:SS a milisegundos
 */
export const mmssToMs = (s?: string | null): number | null => {
  if (!s) return null;
  const m = String(s).match(/^(\d+):(\d{1,2})$/);
  if (!m) return null;
  const min = parseInt(m[1], 10);
  const sec = parseInt(m[2], 10);
  return (min * 60 + sec) * 1000;
};

/**
 * Transforma un objeto song en el payload que espera el backend
 */
export const toTrackPayload = (song: any) => {
  const id = first(song?.id, song?.track_id, song?.track_id, song?.video_id);

  const duration_ms =
    song?.duration_ms ??
    (song?.duration_seconds != null
      ? Math.round(Number(song.duration_seconds) * 1000)
      : mmssToMs(song?.duration));

  const thumbnail_url =
    getUpgradedThumb(song, 512) ??
    upgradeThumbUrl(first(song?.thumbnail_url, song?.thumbnail, song?.albumCover), 512) ??
    null;

  const artist_id = first(song?.artist_id, song?.artist_id, song?.artists?.[0]?.id, null);
  const artist =
    first(
      song?.artist_name,
      song?.artist,
      Array.isArray(song?.artists) 
        ? song.artists.map((a: any) => a?.name).filter(Boolean).join(", ") 
        : null
    ) ?? null;

  const album = first(song?.album_id, song?.album, null);

  return {
    id,
    track_id: id,
    artist_id,
    album,
    duration_ms,
    thumbnail_url,
    extra: song,
    title: song?.title ?? null,
    artist,
  };
};