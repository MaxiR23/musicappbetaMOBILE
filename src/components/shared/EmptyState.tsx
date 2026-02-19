// src/components/shared/EmptyState.tsx
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

/**
 * Props del componente EmptyState:
 * - icon: Nombre del ícono de Ionicons.
 * - iconSize: Tamaño del ícono (default: 48).
 * - iconColor: Color del ícono (default: "#888").
 * - message: Mensaje principal.
 * - submessage: Mensaje secundario (opcional).
 * - actionLabel: Texto del botón de acción (si no se provee, no se muestra botón).
 * - onAction: Callback al presionar el botón.
 */
interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  iconSize?: number;
  iconColor?: string;
  message: string;
  submessage?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Vista de estado vacío/error estandarizada.
 * Muestra ícono + mensaje + submensaje opcional + botón de acción opcional.
 * Ocupa todo el espacio disponible (flex: 1) y centra el contenido.
 *
 * @example
 * // Error simple
 * <EmptyState
 *   icon="alert-circle-outline"
 *   message="Error al cargar playlists"
 * />
 *
 * // Con retry button
 * <EmptyState
 *   icon="alert-circle-outline"
 *   message="Error al cargar datos"
 *   actionLabel="Reintentar"
 *   onAction={() => refetch()}
 * />
 *
 * // Empty state
 * <EmptyState
 *   icon="musical-notes-outline"
 *   message="No hay playlists disponibles"
 *   submessage='en la categoría "Rock"'
 * />
 */

export default function EmptyState({
  icon = "information-circle-outline",
  iconSize = 48,
  iconColor = "#888",
  message,
  submessage,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={iconSize} color={iconColor} />
      
      <Text style={styles.message}>{message}</Text>
      
      {submessage && <Text style={styles.submessage}>{submessage}</Text>}
      
      {actionLabel && onAction && (
        <TouchableOpacity onPress={onAction} style={styles.button}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 8,
  },
  message: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 12,
  },
  submessage: {
    color: "#888",
    fontSize: 14,
    textAlign: "center",
  },
  button: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#1e1e1e",
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
});