// hooks/use-player-expansion.ts
import { useNavigation } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, BackHandler, Dimensions } from "react-native";

const SCREEN_HEIGHT = Dimensions.get("window").height;

/**
 * Hook para manejar el estado expandido/colapsado del music player
 * Incluye animación, back handlers y navegación
 */
export function usePlayerExpansion() {
  const navigation = useNavigation();
  const [isExpanded, setIsExpanded] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  
  // Ref para acceder al estado en callbacks
  const isExpandedRef = useRef(isExpanded);
  
  useEffect(() => {
    isExpandedRef.current = isExpanded;
  }, [isExpanded]);

  // Animar cuando cambia el estado
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isExpanded ? 0 : SCREEN_HEIGHT,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isExpanded, slideAnim]);

  // Manejar back button y navegación
  useEffect(() => {
    if (!isExpanded) return;

    // Listener de navegación
    const unsubNav = navigation.addListener?.("beforeRemove", (e: any) => {
      e.preventDefault();
      setIsExpanded(false);
    });

    // Back button de Android
    const hw = BackHandler.addEventListener("hardwareBackPress", () => {
      setIsExpanded(false);
      return true;
    });

    return () => {
      unsubNav && unsubNav();
      hw.remove();
    };
  }, [isExpanded, navigation]);

  const expand = () => setIsExpanded(true);
  const collapse = () => setIsExpanded(false);
  const toggle = () => setIsExpanded(prev => !prev);

  return {
    isExpanded,
    isExpandedRef,
    slideAnim,
    expand,
    collapse,
    toggle,
    setIsExpanded,
  };
}