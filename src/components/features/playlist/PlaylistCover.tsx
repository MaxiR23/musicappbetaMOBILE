// src/components/features/playlist/PlaylistCover.tsx
import React from "react";
import { Image, StyleSheet, View } from "react-native";

/**
 * Replica del generatePlaylistCover (web) pero en React Native.
 * - Si no hay imágenes: placeholder.
 * - Si hay < 4: muestra la primera portada.
 * - Si hay >= 4: grilla 2x2 con las primeras 4.
 * - Si no se pasa size, se adapta al 100% del contenedor.
 */
export default function PlaylistCover({
  images,
  size,
  borderRadius = 20,
}: {
  images: string[];
  size?: number;
  borderRadius?: number;
}) {
  const safe = Array.isArray(images) ? images.filter(Boolean) : [];

  const containerStyle = size
    ? { width: size, height: size, borderRadius }
    : { width: "100%", height: "100%", borderRadius };

  // Placeholder sin imágenes
  if (safe.length === 0) {
    return (
      <View
        style={[
          styles.container,
          containerStyle,
          { backgroundColor: "#333" },
        ]}
      />
    );
  }

  // Una sola imagen (o menos de 4)
  if (safe.length < 4) {
    return (
      <View style={[styles.container, containerStyle]}>
        <Image source={{ uri: safe[0] }} style={styles.single} />
      </View>
    );
  }

  // 4 o más → 2x2
  const firstFour = safe.slice(0, 4);
  return (
    <View style={[styles.container, containerStyle]}>
      {firstFour.map((uri, i) => (
        <Image key={i} source={{ uri }} style={styles.quad} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    backgroundColor: "#222",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  single: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  quad: {
    width: "50%",
    height: "50%",
    resizeMode: "cover",
  },
});