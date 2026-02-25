import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

/**
 * Props del componente LoadingView:
 * - message: Mensaje opcional debajo del spinner.
 * - size: Tamaño del spinner ("small" | "large") (default: "large").
 * - color: Color del spinner (default: "#fff").
 */
interface LoadingViewProps {
  message?: string;
  size?: "small" | "large";
  color?: string;
}

/**
 * Vista de loading estandarizada con spinner y mensaje opcional.
 * Ocupa todo el espacio disponible (flex: 1) y centra el contenido.
 *
 * @example
 * <LoadingView />
 *
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