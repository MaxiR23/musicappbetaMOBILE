// utils/image-helpers.ts
import { upgradeYtmImage } from "./ytmImage";

/**
 * Obtiene la thumbnail de mejor calidad de un array
 * (última posición tiene mejor resolución en YTM)
 */
export function getHighestQualityThumb(thumbnails?: any[]): string | null {
  if (!thumbnails?.length) return null;
  return thumbnails[thumbnails.length - 1]?.url || thumbnails[0]?.url || null;
}

/**
 * Obtiene y mejora la thumbnail de un item (album, single, artist, etc)
 * @param item - objeto con propiedad `thumbnails`, `thumbnail`, o `thumb`
 * @param size - tamaño deseado (256, 512, 1200, etc)
 */
export function getUpgradedThumb(item: any, size: number = 512): string | undefined {
  // Intenta múltiples propiedades comunes
  const raw =
    item?.thumbnails
      ? getHighestQualityThumb(item.thumbnails)
      : item?.thumbnail?.url ?? item?.thumbnail ?? item?.thumb ?? item?.img ?? null;

  return upgradeYtmImage(raw, size);
}

/**
 * Extrae thumbnail directamente de un string/objeto
 * Útil para cuando ya tenés la URL cruda
 */
export function upgradeThumbUrl(url: string | null | undefined, size: number = 512): string | undefined {
  return upgradeYtmImage(url, size);
}