// hooks/use-player-theme.ts
import { useEffect, useState } from "react";
import { getThemeFromImage } from "../utils/colorUtils.native";
import { upgradeYtmImage } from "../utils/ytmImage";

const DEFAULT_GRADIENT: [string, string] = [
  "rgba(0,0,0,0.2)",
  "rgba(0,0,0,0.85)",
];

/**
 * Hook para extraer colores dominantes de la imagen del album/track
 * y generar un gradiente para el fondo del player
 */
export function usePlayerTheme(rawThumb: string) {
  const [gradient, setGradient] = useState<[string, string]>(DEFAULT_GRADIENT);

  useEffect(() => {
    if (!rawThumb) return;

    let cancelled = false;

    (async () => {
      try {
        // Usar imagen de tamaño medio para análisis de color
        const src = upgradeYtmImage(rawThumb, 512) || rawThumb;
        const theme = await getThemeFromImage(src);
        
        if (!cancelled) {
          setGradient(theme.gradient);
        }
      } catch {
        // En caso de error, usar gradiente por defecto
        if (!cancelled) {
          setGradient(DEFAULT_GRADIENT);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [rawThumb]);

  return { gradient };
}