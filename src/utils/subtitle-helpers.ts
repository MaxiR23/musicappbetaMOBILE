// utils/subtitle-helpers.ts

/**
 * Limpia texto de duración (minutes → min, hours → h)
 */
export function cleanDurationText(text: string): string {
  return text
    .replace(/\bminutes?\b/gi, "min")
    .replace(/\bminutos?\b/gi, "min")
    .replace(/\bhours?\b/gi, "h")
    .replace(/\bhoras?\b/gi, "h");
}

/**
 * Formatea metadata de álbum: "2024 • 12 canciones • 45 min"
 */
export function formatAlbumMeta(info: {
  year?: number;
  songCount?: number;
  durationText?: string;
}): string {
  const parts: string[] = [];

  if (info.year) {
    parts.push(String(info.year));
  }

  if (typeof info.songCount === "number") {
    parts.push(`${info.songCount} ${info.songCount === 1 ? "canción" : "canciones"}`);
  }

  if (info.durationText) {
    const cleaned = cleanDurationText(String(info.durationText));
    parts.push(cleaned);
  }

  return parts.join(" • ");
}

/**
 * Formatea subtítulo de release: "Album • 2024" o "Single • Artist"
 */
export function formatReleaseSubtitle(item: {
  type?: string;
  year?: string | number;
  artistName?: string;
}): string {
  const parts: string[] = [];

  if (item.type) parts.push(item.type);
  if (item.year) parts.push(String(item.year));
  if (item.artistName) parts.push(item.artistName);

  return parts.filter(Boolean).join(" • ");
}

/**
 * Formatea nombre de artistas (array o string)
 */
export function formatArtistNames(
  artists: { name: string }[] | string | undefined
): string {
  if (!artists) return "";
  if (typeof artists === "string") return artists;
  return artists.map((a) => a.name).join(", ");
}