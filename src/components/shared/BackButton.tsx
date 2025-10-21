// src/components/BackButton.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";

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
   * Estilo personalizado del contenedor
   */
  style?: any;
}

/**
 * Botón de navegación "volver" reutilizable
 * Por defecto usa router.back() pero se puede personalizar
 */
export default function BackButton({
  onPress,
  iconColor = "#fff",
  iconSize = 24,
  style,
}: BackButtonProps) {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.back();
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Ionicons name="arrow-back" size={iconSize} color={iconColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    top: 40,
    left: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 8,
    borderRadius: 20,
    zIndex: 10,
  },
});