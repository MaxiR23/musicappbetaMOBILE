import { useEffect, useRef, useState } from "react";
import { Animated } from "react-native";

interface UseSeekSliderParams {
  progress: number; // 0..1
  duration: number; // ms
  currentTime: number; // ms
  onSeek: (val01: number) => void; // 0..1
}

/**
 * Hook para manejar el slider de progreso del player
 * Incluye drag state, animación del knob, y sincronización con playback
 */
export function useSeekSlider({
  progress,
  duration,
  currentTime,
  onSeek,
}: UseSeekSliderParams) {
  const [dragging, setDragging] = useState(false);
  const [localVal, setLocalVal] = useState(0);
  const knobScale = useRef(new Animated.Value(1)).current;

  // Clamped progress (0..1)
  const clamped = Math.max(0, Math.min(1, progress));

  // Sincronizar valor local con progress cuando NO se está arrastrando
  useEffect(() => {
    if (!dragging) setLocalVal(clamped);
  }, [clamped, dragging]);

  // Iniciar drag: animar knob y marcar estado
  const startDrag = () => {
    setDragging(true);
    Animated.spring(knobScale, {
      toValue: 1.25,
      useNativeDriver: true,
      friction: 6,
    }).start();
  };

  // Finalizar drag: restaurar knob y llamar a onSeek
  const endDrag = (v: number) => {
    Animated.spring(knobScale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 6,
    }).start();
    setDragging(false);
    onSeek(v);
  };

  // Tiempo a mostrar: local si está arrastrando, actual si no
  const displayCurrentMs = dragging
    ? Math.round(localVal * (duration || 0))
    : currentTime;

  return {
    dragging,
    localVal,
    knobScale,
    displayCurrentMs,
    setLocalVal,
    startDrag,
    endDrag,
  };
}