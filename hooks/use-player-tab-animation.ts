import { useEffect, useRef } from "react";
import { Animated } from "react-native";

interface UsePlayerTabAnimationProps {
  activeTab: "upnext" | "lyrics" | "related" | null;
}

/**
 * Hook para animar la transición entre player expandido y tabs
 * 
 * tabAnimProgress:
 * - 0 = Player expandido (cover grande, controles visibles)
 * - 1 = Tabs visibles (header minimizado, contenido de tabs)
 */
export function usePlayerTabAnimation({ activeTab }: UsePlayerTabAnimationProps) {
  // Valor animado: 0 (expandido) -> 1 (minimizado con tabs)
  const tabAnimProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Si hay un tab activo, animar hacia "minimizado" (1)
    // Si no hay tab, animar hacia "expandido" (0)
    const toValue = activeTab !== null ? 1 : 0;

    Animated.spring(tabAnimProgress, {
      toValue,
      useNativeDriver: true,
      friction: 9, // Más suave
      tension: 50, // Menos rebote
    }).start();
  }, [activeTab, tabAnimProgress]);

  // Interpolaciones para diferentes elementos

  // Cover: escala de 1 (grande) a 0.3 (pequeño) y se mueve hacia arriba
  const coverScale = tabAnimProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.3],
  });

  const coverTranslateY = tabAnimProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -200], // Se mueve 200px arriba
  });

  // Opacidad de los controles (player normal)
  const controlsOpacity = tabAnimProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  // Opacidad de PlayerTabs
  const tabsOpacity = tabAnimProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // TranslateY de PlayerTabs (empieza abajo y sube)
  const tabsTranslateY = tabAnimProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [100, 0], // Empieza 100px abajo
  });

  return {
    tabAnimProgress,
    coverScale,
    coverTranslateY,
    controlsOpacity,
    tabsOpacity,
    tabsTranslateY,
  };
}