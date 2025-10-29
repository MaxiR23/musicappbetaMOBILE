// src/components/BackButton.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface BackButtonProps {
  /**
   * Callback personalizado al presionar (por defecto usa router.back())
   */
  onPress?: () => void;

  /**
   * Color del ícono (por defecto blanco)
   */
  iconColor?: string;

  /**
   * Tamaño del ícono (por defecto 24)
   */
  iconSize?: number;

  /**
   * Si debe ser position: absolute (default: true)
   */
  absolute?: boolean;

  /**
   * Si debe tener fondo semi-transparente (default: true cuando absolute=true)
   */
  withBackground?: boolean;

  /**
   * Tipo de ícono a usar
   */
  icon?: "arrow-back" | "chevron-back";

  /**
   * Offset adicional desde el top (se suma al safe area)
   */
  topOffset?: number;

  /**
   * Posición left cuando es absolute
   */
  left?: number;

  /**
   * Ancho del botón
   */
  width?: number;

  /**
   * Alto del botón
   */
  height?: number;

  /**
   * Estilo personalizado del contenedor
   */
  style?: ViewStyle;
}

/**
 * Botón de navegación "volver" reutilizable
 * Por defecto usa router.back() y respeta el safe area (notch/notificaciones)
 */
export default function BackButton({
  onPress,
  iconColor = "#fff",
  iconSize = 24,
  absolute = true,
  withBackground,
  icon = "arrow-back",
  topOffset = 8,
  left = 20,
  width,
  height,
  style,
}: BackButtonProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Si no se especifica withBackground, por defecto true cuando es absolute
  const showBackground = withBackground !== undefined ? withBackground : absolute;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.back();
    }
  };

  // Calcular top respetando safe area
  const calculatedTop = absolute ? insets.top + topOffset : undefined;

  const buttonStyle: ViewStyle[] = [
    styles.button,
    absolute && { position: "absolute", top: calculatedTop, left },
    showBackground && styles.withBackground,
    width !== undefined && { width },
    height !== undefined && { height },
    style,
  ].filter(Boolean) as ViewStyle[];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={iconSize} color={iconColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    borderRadius: 20,
    zIndex: 10,
  },
  withBackground: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
});