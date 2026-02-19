/**
 * Normaliza artistas relacionados de diferentes formatos
 */
export function normalizeRelatedArtists(related: any): {
  id: string;
  name: string;
  subtitle: string;
  img: string | null;
}[] {
  const src = related;
  const list = Array.isArray(src) ? src : (src?.items ?? []);

  return (list || [])
    .map((r: any) => {
      // Extrae ID de múltiples propiedades posibles
      const id =
        r.id ?? r.browseId ?? r.channelId ?? r.artistId ?? null;

      // Extrae nombre
      const name = r.name ?? r.title ?? r.artist ?? "";

      // Extrae subtítulo
      const subtitle = r.subtitle ?? r.subTitle ?? r.subtext ?? "";

      // Extrae imagen
      const img =
        r.thumbnail?.url ??
        r.thumbnail ??
        r.thumbnails?.[r.thumbnails.length - 1]?.url ??
        null;

      return { id, name, subtitle, img };
    })
    .filter((x) => x.id && x.name); // Solo items válidos
}

/**
 * Extrae nombres de artistas incluidos en un álbum/track
 */
export function extractIncludedArtists(info: any): string {
  if (!info) return "";

  if (info.includedArtists?.length) {
    return (info.includedArtists as any[])
      .map((a) => a?.name)
      .filter(Boolean)
      .join(", ");
  }

  if (info.artistName) {
    return info.artistName;
  }

  return "";
}

/**
 * Retorna el primer valor no nulo/vacío de una lista
 * Útil para fallbacks de propiedades con múltiples nombres posibles
 * 
 * @example
 * first(undefined, null, "", "valid") // "valid"
 * first(song.artistId, song.artist_id, song.artists?.[0]?.id) // primer valor válido
 */
export function first<T>(...vals: T[]): T | undefined {
  return vals.find(v => v !== undefined && v !== null && v !== "");
}