// hooks/use-repeat-mode.ts
import { useEffect, useState } from "react";
import TrackPlayer, { RepeatMode } from "react-native-track-player";

export function useRepeatMode() {
  const [repeatOne, setRepeatOne] = useState(false);

  // Solo cargar estado inicial
  useEffect(() => {
    (async () => {
      try {
        const mode = await TrackPlayer.getRepeatMode();
        setRepeatOne(mode === RepeatMode.Track);
      } catch {}
    })();
  }, []);

  const toggleRepeatOne = async () => {
    const next = !repeatOne;
    setRepeatOne(next); // ← Actualizá PRIMERO el estado local
    
    try {
      await TrackPlayer.setRepeatMode(next ? RepeatMode.Track : RepeatMode.Off);
    } catch (e) {
      console.warn("Error repeat:", e);
      setRepeatOne(!next); // Si falla, revertí el estado
    }
  };

  return { repeatOne, toggleRepeatOne };
}