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

        // INFO: iOS has no "dominant" key; we pick the highest-luminance color among background/primary/secondary/detail. 
        // REF: github.com/osamaqarem/react-native-image-colors v2.6.0 (mar 2026)
        const extracted =
          Platform.OS === "ios"
            ? (() => {
              const { background, primary, secondary, detail } = result as any;
              const candidates = [primary, secondary, detail, background].filter(Boolean);
              const luma = (hex: string) => {
                const h = hex.replace("#", "");
                const r = parseInt(h.slice(0, 2), 16);
                const g = parseInt(h.slice(2, 4), 16);
                const b = parseInt(h.slice(4, 6), 16);
                return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
              };
              return candidates.reduce((best, c) => (luma(c) > luma(best) ? c : best), candidates[0] || DEFAULT_COLOR);
            })()
            : (result as any).dominant;

        const finalColor = extracted || DEFAULT_COLOR;
        setColor(isLightColor(finalColor) ? darkenHex(finalColor) : finalColor);
        setIsLight(isLightColor(finalColor));
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