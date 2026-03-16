import * as PlayerService from "@/services/PlayerService";
import { useEffect, useState } from "react";

export function useRepeatMode() {
  const [repeatOne, setRepeatOne] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // No hay getRepeatMode en PlayerService, arrancamos en off
        setRepeatOne(false);
      } catch {}
    })();
  }, []);

  const toggleRepeatOne = async () => {
    const next = !repeatOne;
    setRepeatOne(next);

    try {
      await PlayerService.setRepeatMode(
        next ? PlayerService.RepeatMode.Track : PlayerService.RepeatMode.Off
      );
    } catch (e) {
      console.warn("Error repeat:", e);
      setRepeatOne(!next);
    }
  };

  return { repeatOne, toggleRepeatOne };
}