export type RGB = [number, number, number];
export type ThemeFromImage = {
  /** Scrim para superponer sobre la portada blur. Orden LinearGradient: [top, bottom] */
  gradient: [string, string];
  /** Color de acento determinístico (para botón/slider) */
  accent: string;
  textOnAccent: "#000" | "#fff";
};

/* ───────── helpers ───────── */
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
export const rgba = (rgb: RGB, a: number) =>
  `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${clamp01(a)})`;

export const rgbToHsl = (r: number, g: number, b: number) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return { h, s, l };
};

export const hslToRgb = (h: number, s: number, l: number): RGB => {
  h = ((h % 360) + 360) % 360;
  s = clamp01(s); l = clamp01(l);
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
};

const relativeLuminance = (rgb: RGB) => {
  const srgb = rgb.map(v => v / 255).map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
};
const contrastRatio = (a: RGB, b: RGB) => {
  const L1 = relativeLuminance(a);
  const L2 = relativeLuminance(b);
  const [hi, lo] = L1 >= L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
};
export const textOn = (bg: RGB): "#000" | "#fff" =>
  contrastRatio(bg, [0,0,0]) >= contrastRatio(bg, [255,255,255]) ? "#000" : "#fff";

const toHex = (rgb: RGB) => "#" + rgb.map(v => v.toString(16).padStart(2, "0")).join("");

/* ───────── seed determinístico (sin nativo) ───────── */
const hash32 = (s: string) => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
const hueFrom = (seed: string) => (hash32(seed) % 360);

/** Color base “agradable” para acentos, derivado de la URL */
const accentFromSeed = (seed: string): RGB => {
  const h = hueFrom(seed);
  const s = 0.6 + ((hash32(seed + "s") % 15) / 100); // 0.60..0.75
  const l = 0.45 + ((hash32(seed + "l") % 10) / 100); // 0.45..0.55
  return hslToRgb(h, Math.min(0.75, s), Math.min(0.55, l));
};

/** Scrim estándar para legibilidad encima del blur */
export const SCRIM_GRADIENT: [string, string] = [
  "rgba(0,0,0,0.20)",
  "rgba(0,0,0,0.85)",
];

/* ───────── tema “desde imagen” para Expo (sin leer píxeles) ─────────
   - El fondo real lo pone la propia portada (blur) en el componente
   - Acá solo devolvemos: scrim + accent determinístico
*/
export async function getThemeFromImage(url: string): Promise<ThemeFromImage> {
  const acc = accentFromSeed(url);
  const accent = toHex(acc);
  const text = textOn(acc);
  return {
    gradient: SCRIM_GRADIENT,
    accent,
    textOnAccent: text,
  };
}