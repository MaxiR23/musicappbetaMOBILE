/**
 * Sube el tamaño de una imagen de la url.
 * cambiando el sufijo de tamaño. Si no reconoce el formato, devuelve la URL tal cual.
 *
 * Defaults:
 *  - format: rw (WebP, mejor compresión/calidad que rj/JPEG)
 *  - quality: 94
 *
 * Ejemplos de entrada comunes:
 *  - ...=w60-h60-l90-rj
 *  - ...=w120-h120-p-l90-rj   (el -p- hace smart-crop, lo sacamos)
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
    const suffix = `=w${size}-h${size}-l94-rw`;

    // =w120-h120-l90-rj  ó  =w120-h120-p-l90-rj  ó  =w120-h120
    const hasWH = /=w\d+-h\d+(?:-[a-z0-9-]+)?$/i.test(u);
    if (hasWH) {
      return u.replace(/=w\d+-h\d+(?:-[a-z0-9-]+)?$/i, suffix);
    }

    // =s120 (formato simple que a veces aparece)
    const hasS = /=s\d+$/i.test(u);
    if (hasS) {
      return u.replace(/=s\d+$/i, suffix);
    }

    // Si es lh3 y no trae sufijo, lo agregamos
    if (/^https?:\/\/lh3\.googleusercontent\.com\//i.test(u)) {
      return `${u}${suffix}`;
    }

    // Si no es lh3 o no matchea nada, devolver igual
    return u;
  } catch {
    return url ?? undefined;
  }
}