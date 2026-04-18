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
  else if (max === g) h = ((b - r) / d + (g < b ? 6 : 0)) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s, l };
}

// Near-black OR near-white OR TRUE gray.
// INFO: The saturation threshold is intentionally low (0.06) so that desaturated
// but still perceptibly tinted colors (navy blues, teal oceans, muted jeans) pass
// through. Only pure/near-pure grays get filtered out.
function isUnusable(hex: string): boolean {
  const { s, l } = hexToHsl(hex);
  if (l < 0.08) return true; // near-black
  if (l > 0.92) return true; // near-white
  if (s < 0.06) return true; // true gray
  return false;
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

        const extracted =
          Platform.OS === "ios"
            ? (() => {
                const { background, primary, secondary, detail } = result as any;

                // INFO: Guard for mostly-black covers (e.g. Young Miko "SWAG").
                // When `background` is near-black, the image is almost entirely black
                // and the other candidates get polluted by JPEG YCbCr artifacts
                // (typical lavender/magenta tint on near-white sub-regions like the
                // parental advisory strip). Force DEFAULT_COLOR in that case.
                if (background) {
                  const { l: bgL } = hexToHsl(background);
                  if (bgL < 0.08) return { color: DEFAULT_COLOR };
                }

                // INFO: UIImageColors returns raw edge/dominant pixels. For images with
                // heavy black/gray borders (e.g. "Your month in music" card), `background`
                // is a non-color that swallows the UI. Walk candidates in order and pick
                // the first usable one (not black/white/gray). Fall back to raw values
                // only if nothing passes.
                const candidates = [background, primary, secondary, detail].filter(Boolean) as string[];
                const usable = candidates.find((c) => !isUnusable(c));
                const pickedColor = usable || background || primary || DEFAULT_COLOR;

                return { color: pickedColor };
              })()
            : { color: (result as any).dominant };

        const finalColor = extracted.color || DEFAULT_COLOR;

        // INFO: Unified rule across iOS and Android. Previously iOS used a vote across
        // the 4 candidates (`imageIsLight`), which failed on white album covers (Young
        // Miko DND) because UIImageColors returns dark primary/secondary/detail to
        // contrast with a white background, so the vote never crossed 50%. Checking
        // the final picked color directly (like Android) makes both platforms behave
        // consistently and guarantees white backgrounds get darkened.
        const rawIsLight = isLightColor(finalColor);

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