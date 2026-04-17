import { upgradeYtmImage } from "../utils/ytmImage";
import { useImageDominantColor } from "./use-image-dominant-color";

export function usePlayerTheme(rawThumb: string) {
  const src = rawThumb ? upgradeYtmImage(rawThumb, 512) || rawThumb : null;
  const { color } = useImageDominantColor(src);

  const gradient: [string, string] = [color, "rgba(0,0,0,0.85)"];

  return { gradient };
}