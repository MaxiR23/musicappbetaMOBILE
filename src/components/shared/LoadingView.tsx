// src/components/shared/LoadingView.tsx
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

interface LoadingViewProps {
  /** Mensaje a mostrar debajo del spinner (opcional) */
  message?: string;
  /** Tamaño del spinner (default: "large") */
  size?: "small" | "large";
  /** Color del spinner (default: "#fff") */
  color?: string;
}

/**
 * Vista de loading estandarizada con spinner y mensaje opcional.
 * Ocupa todo el espacio disponible (flex: 1) y centra el contenido.
 * 
 * @example
 * <LoadingView />
 * 
 * @example
 * <LoadingView message="Cargando playlists..." />
 */
export default function LoadingView({
  message,
  size = "large",
  color = "#fff",
}: LoadingViewProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={color} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  message: {
    color: "#888",
    fontSize: 14,
  },
});