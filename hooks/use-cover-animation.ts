import { useEffect, useRef } from "react";
import { Animated } from "react-native";

/**
 * Hook para animar el cover del player cuando cambia el estado de reproducción
 * El cover se escala ligeramente cuando está en pausa (efecto sutil)
 */
export function useCoverAnimation(isPlaying: boolean) {
  const coverScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(coverScale, {
      toValue: isPlaying ? 1 : 0.90, // Pausado: levemente más chico
      useNativeDriver: true,
      friction: 10,
      tension: 70,
    }).start();
  }, [isPlaying, coverScale]);

  return { coverScale };
}