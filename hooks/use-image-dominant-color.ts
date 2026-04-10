// SEE: https://github.com/osamaqarem/react-native-image-colors
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { getColors } from "react-native-image-colors";

const DEFAULT_COLOR = "#1a1a1a";

function isLightColor(hex: string): boolean {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.65;
}

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
            ? (result as any).background
            : (result as any).dominant;

        const finalColor = extracted || DEFAULT_COLOR;
        setColor(finalColor);
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