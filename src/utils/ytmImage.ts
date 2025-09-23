// src/utils/ytmImage.ts

/**
 * Sube el tamaño de una imagen de YT Music (lh3.googleusercontent.com)
 * cambiando el sufijo de tamaño. Si no reconoce el formato, devuelve la URL tal cual.
 *
 * Ejemplos de entrada comunes:
 *  - ...=w60-h60-l90-rj
 *  - ...=w120-h120
 *  - ...=s120
 *  - ... (sin sufijo)
 */
export function upgradeYtmImage(
  url?: string | null,
  size = 512
): string | undefined {
  if (!url) return url ?? undefined;
  try {
    const u = String(url);

    // =w120-h120-l90-rj  ó  =w120-h120
    const hasWH = /=w\d+-h\d+(?:-[a-z0-9-]+)?$/i.test(u);
    if (hasWH) {
      return u.replace(
        /=w\d+-h\d+(?:-[a-z0-9-]+)?$/i,
        `=w${size}-h${size}-l90-rj`
      );
    }

    // =s120 (formato simple que a veces aparece)
    const hasS = /=s\d+$/i.test(u);
    if (hasS) {
      return u.replace(/=s\d+$/i, `=w${size}-h${size}-l90-rj`);
    }

    // Si es lh3 y no trae sufijo, lo agregamos
    if (/^https?:\/\/lh3\.googleusercontent\.com\//i.test(u)) {
      return `${u}=w${size}-h${size}-l90-rj`;
    }

    // Si no es lh3 o no matchea nada, devolver igual
    return u;
  } catch {
    return url ?? undefined;
  }
}