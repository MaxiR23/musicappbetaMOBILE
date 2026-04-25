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
 * Transforma un objeto song en el payload que espera el backend POST /playlists/{id}/tracks.
 * Lanza error si falta cualquier campo obligatorio (backend exige todos not null).
 */
export const toTrackPayload = (song: any) => {
  const track_id = song?.track_id ?? song?.id;
  const title = song?.title;
  const album = song?.album_name;
  const album_id = song?.album_id;

  const duration_seconds =
    song?.duration_seconds ??
    (() => {
      const ms = mmssToMs(song?.duration);
      return ms != null ? Math.round(ms / 1000) : null;
    })();

  const thumbnail_url =
    getUpgradedThumb(song, 512) ??
    upgradeThumbUrl(first(song?.thumbnail_url, song?.thumbnail), 512) ??
    null;

  const artists = Array.isArray(song?.artists)
    ? song.artists
      .filter((a: any) => a?.name)
      .map((a: any) => ({ id: a?.id ?? null, name: a.name }))
    : [];

  const missing: string[] = [];
  if (!track_id) missing.push("track_id");
  if (!title) missing.push("title");
  if (!album) missing.push("album");
  if (!album_id) missing.push("album_id");
  if (!thumbnail_url) missing.push("thumbnail_url");
  if (artists.length === 0) missing.push("artists");

  if (missing.length > 0) {
    throw new Error(
      `toTrackPayload: missing required fields: ${missing.join(", ")}. Song: ${JSON.stringify(song)}`
    );
  }

  return {
    track_id,
    title,
    artists,
    album,
    album_id,
    duration_seconds: duration_seconds ?? null,
    thumbnail_url,
  };
};