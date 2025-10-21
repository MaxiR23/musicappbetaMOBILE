// hooks/use-repeat-mode.ts
import { useEffect, useState } from "react";
import TrackPlayer, { RepeatMode } from "react-native-track-player";

/**
 * Hook para manejar el modo de repetición del player
 * Sincroniza con TrackPlayer y permite toggle entre Off y Track
 */
export function useRepeatMode() {
  const [repeatOne, setRepeatOne] = useState(false);

  // Inicializar el estado desde TrackPlayer al montar
  useEffect(() => {
    (async () => {
      try {
        const mode = await (TrackPlayer as any).getRepeatMode?.();
        setRepeatOne(mode === RepeatMode.Track);
      } catch {
        // Si falla, asumir Off
      }
    })();
  }, []);

  // Toggle entre RepeatMode.Track y RepeatMode.Off
  const toggleRepeatOne = async () => {
    const next = !repeatOne;
    setRepeatOne(next);

    try {
      await TrackPlayer.setRepeatMode(next ? RepeatMode.Track : RepeatMode.Off);
    } catch (e) {
      console.warn(
        "Repeat no soportado por RNTP, quedó en:",
        next ? "Track" : "Off",
        e
      );
    }
  };

  return {
    repeatOne,
    toggleRepeatOne,
  };
}