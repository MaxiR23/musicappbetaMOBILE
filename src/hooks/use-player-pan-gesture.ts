import { useRef, useState } from "react";
import { Animated, Dimensions, PanResponder } from "react-native";

const SCREEN_HEIGHT = Dimensions.get("window").height;

interface UsePlayerPanGestureParams {
  isExpandedRef: React.MutableRefObject<boolean>;
  slideAnim: Animated.Value;
  collapse: () => void;
}

/**
 * Hook para manejar el gesto de drag para cerrar el player expandido
 * Incluye lógica de panLocked para evitar conflictos con ScrollView
 */
export function usePlayerPanGesture({
  isExpandedRef,
  slideAnim,
  collapse,
}: UsePlayerPanGestureParams) {
  // Bloquear pan mientras se scrollea
  const [panLocked, setPanLocked] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      
      // Solo activar si está expandido, no está bloqueado, y es un drag vertical hacia abajo
      onMoveShouldSetPanResponder: (_e, g) =>
        isExpandedRef.current && !panLocked && g.dy > 8 && Math.abs(g.dx) < 8,
      onMoveShouldSetPanResponderCapture: (_e, g) =>
        isExpandedRef.current && !panLocked && g.dy > 8 && Math.abs(g.dx) < 8,
      
      // Detener animación actual cuando se inicia el drag
      onPanResponderGrant: () => {
        slideAnim.stopAnimation();
      },
      
      // Seguir el dedo mientras se arrastra
      onPanResponderMove: (_e, g) => {
        if (!isExpandedRef.current || panLocked) return;
        // Limitar el movimiento entre 0 y SCREEN_HEIGHT (no permitir arrastrar hacia arriba)
        const y = Math.min(Math.max(g.dy, 0), SCREEN_HEIGHT);
        slideAnim.setValue(y);
      },
      
      // Decidir si cerrar o rebotar cuando se suelta
      onPanResponderRelease: (_e, g) => {
        if (!isExpandedRef.current || panLocked) return;
        
        // Cerrar si la velocidad es suficiente O si se arrastró más del 20% de la pantalla
        const shouldClose = g.vy > 0.7 || g.dy > SCREEN_HEIGHT * 0.2;
        
        Animated.timing(slideAnim, {
          toValue: shouldClose ? SCREEN_HEIGHT : 0,
          duration: 220,
          useNativeDriver: true,
        }).start(() => {
          if (shouldClose) collapse();
        });
      },
    })
  ).current;

  return {
    panResponder,
    panLocked,
    setPanLocked,
  };
}