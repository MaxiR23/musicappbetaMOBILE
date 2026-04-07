import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

// Mapa exacto de los 10 generos en DB
const GENRE_GRADIENTS: Record<string, [string, string, string]> = {
  "dance-electronic":  ["#00BCD4", "#00E5FF", "#006064"],
  "decades":           ["#BF953F", "#D4AF37", "#8E6F2E"],
  "hip-hop":           ["#F57C00", "#FF9800", "#E65100"],
  "indie-alternative": ["#558B2F", "#7CB342", "#33691E"],
  "jazz":              ["#1A237E", "#3949AB", "#0D1545"],
  "pop":               ["#E84393", "#FD79A8", "#C2185B"],
  "rnb-soul":          ["#7B1FA2", "#AB47BC", "#4A148C"],
  "rock":              ["#B71C1C", "#E53935", "#7F0000"],
  "tropical":          ["#00897B", "#26A69A", "#004D40"],
  "urbano":            ["#4A148C", "#7C4DFF", "#311B92"],
};

const FALLBACK: [string, string, string] = ["#37474F", "#546E7A", "#263238"];

interface GenreCardProps {
  name: string;
  slug: string;
  onPress: () => void;
}

export default React.memo(function GenreCard({ name, slug, onPress }: GenreCardProps) {
  const colors = GENRE_GRADIENTS[slug] || FALLBACK;

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.card}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <View style={[styles.circle, styles.circleTopRight]} />
        <View style={[styles.circle, styles.circleBottomLeft]} />
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    height: 100,
    borderRadius: 14,
    overflow: "hidden",
  },
  gradient: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 14,
  },
  circle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  circleTopRight: {
    width: 80,
    height: 80,
    top: -20,
    right: -20,
  },
  circleBottomLeft: {
    width: 50,
    height: 50,
    bottom: -12,
    left: -12,
  },
  name: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});