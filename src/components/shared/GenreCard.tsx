// src/components/shared/GenreCard.tsx
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface GenreCardProps {
  /** Nombre del género */
  name: string;
  /** Slug del género (para navegación) */
  slug: string;
  /** Callback al presionar */
  onPress: () => void;
  /** FUTURO: Gradient colors */
  gradient?: string[];
}

/**
 * Card para mostrar un género musical.
 * Preparada para agregar gradients en el futuro.
 */
export default React.memo(function GenreCard({
  name,
  slug,
  onPress,
  gradient,
}: GenreCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.card}
      onPress={onPress}
    >
      {/* Por ahora background sólido, después gradient */}
      <View style={[styles.content, gradient ? null : styles.defaultBg]}>
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    overflow: "hidden",
  },
  content: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    minHeight: 80,
    justifyContent: "center",
  },
  defaultBg: {
    backgroundColor: "#1a1a1a",
  },
  name: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});