// SEE: https://github.com/osamaqarem/react-native-image-colors
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { getColors } from "react-native-image-colors";

const DEFAULT_COLOR = "#1a1a1a";

// TODO: MOVE TO UTILS {
function isLightColor(hex: string): boolean {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.45;
}

function darkenHex(hex: string, factor: number = 0.45): string {
  const c = hex.replace("#", "");
  const r = Math.round(parseInt(c.substring(0, 2), 16) * factor);
  const g = Math.round(parseInt(c.substring(2, 4), 16) * factor);
  const b = Math.round(parseInt(c.substring(4, 6), 16) * factor);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s, l };
}

// Descarta colores oscuros con cast calido (artefacto tipico de JPEG YCbCr en near-black).
// Solo afecta: oscuro (l<0.25) + saturado (s>0.12) + hue calido (10deg-55deg = marron/tierra).
// Azul oscuro, verde oscuro, violeta oscuro: pasan sin cambios.
function normalizeColor(hex: string): string {
  const { h, s, l } = hexToHsl(hex);
  if (l < 0.25 && s > 0.12 && (h <= 55 || h >= 330)) return DEFAULT_COLOR;
  return hex;
}
// TODO: MOVE TO UTILS }

export function useImageDominantColor(imageUrl: string | null | undefined) {
  const [color, setColor] = useState<string>(DEFAULT_COLOR);
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    if (!imageUrl) return;

    let cancelled = false;

    getColors(imageUrl, {
      fallback: DEFAULT_COLOR,
      cache: true,
      key: imageUrl,
    })
      .then((result) => {
        if (cancelled) return;

        // INFO: iOS has no "dominant" key; background es el equivalente semantico.
        // REF: github.com/osamaqarem/react-native-image-colors v2.6.0 (mar 2026)
        const extracted =
          Platform.OS === "ios"
            ? (() => {
                const { background, primary, secondary, detail } = result as any;
                const candidates = [background, primary, secondary, detail].filter(Boolean);
                const lightCount = candidates.filter(isLightColor).length;
                const imageIsLight = lightCount >= Math.ceil(candidates.length / 2);
                const color = background || primary || DEFAULT_COLOR;
                return { color, imageIsLight };
              })()
            : { color: (result as any).dominant, imageIsLight: false };

        const rawColor = extracted.color || DEFAULT_COLOR;
        const { h, s, l } = hexToHsl(rawColor);
        console.log("[DominantColor]", { rawColor, h: h.toFixed(1), s: s.toFixed(3), l: l.toFixed(3) });
        const finalColor = normalizeColor(rawColor);
        const rawIsLight = Platform.OS === "ios" ? extracted.imageIsLight : isLightColor(finalColor);

        setColor(rawIsLight ? darkenHex(finalColor) : finalColor);
        setIsLight(rawIsLight);
      })
      .catch(() => {
        if (!cancelled) {
          setColor(DEFAULT_COLOR);
          setIsLight(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  return { color, isLight };
}