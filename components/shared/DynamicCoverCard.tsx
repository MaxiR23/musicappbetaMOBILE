import { useImageDominantColor } from "@/hooks/use-image-dominant-color";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type DynamicCoverCardProps = {
  thumbnailUrl: string | null | undefined;
  label: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  width: number;
  height: number;
};

export default function DynamicCoverCard({
  thumbnailUrl,
  label,
  title,
  subtitle,
  onPress,
  width,
  height,
}: DynamicCoverCardProps) {
  const { color: dominantColor, isLight } = useImageDominantColor(thumbnailUrl);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.card, { width, height, backgroundColor: dominantColor }]}
    >
      <View>
        {thumbnailUrl ? (
          <Image
            source={thumbnailUrl}
            style={styles.cover}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.cover, { backgroundColor: "#2a2a2a" }]} />
        )}
        <LinearGradient
          colors={["transparent", dominantColor]}
          style={styles.coverFade}
        />
      </View>
      <View style={styles.footer}>
        <Text style={[styles.label, isLight && { color: "rgba(0,0,0,0.6)" }]}>{label}</Text>
        <Text style={[styles.title, isLight && { color: "#000" }]} numberOfLines={2}>
          {title}
        </Text>
        <Text style={[styles.subtitle, isLight && { color: "rgba(0,0,0,0.5)" }]} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    overflow: "hidden",
  },
  cover: {
    width: "100%",
    aspectRatio: 1,
  },
  coverFade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 8,
  },
  footer: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 14,
    gap: 2,
  },
  label: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 18,
  },
  subtitle: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 10,
    fontWeight: "500",
  },
});