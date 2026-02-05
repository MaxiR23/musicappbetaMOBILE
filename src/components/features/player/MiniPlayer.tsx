import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface MiniPlayerProps {
  thumbUrl: string;
  title: string;
  artistName: string;
  gradient: [string, string];
  isPlaying: boolean;
  hasNext: boolean;
  onExpand: () => void;
  onArtistPress: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
}

/**
 * Mini player colapsado que se muestra en la parte inferior de la pantalla
 */
export function MiniPlayer({
  thumbUrl,
  title,
  artistName,
  gradient,
  isPlaying,
  hasNext,
  onExpand,
  onArtistPress,
  onTogglePlay,
  onNext,
}: MiniPlayerProps) {
  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={[gradient[0], gradient[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glassOverlay} />

      <View style={styles.container}>
        <Image source={{ uri: thumbUrl }} style={styles.thumbnail} />

        <View style={styles.info}>
          <Pressable onPress={onExpand} hitSlop={6}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          </Pressable>
          <Pressable onPress={onArtistPress} style={{ alignSelf: "flex-start" }}>
            <Text style={styles.artist} numberOfLines={1}>
              {artistName}
            </Text>
          </Pressable>
        </View>

        <TouchableOpacity onPress={onTogglePlay} style={styles.iconButton}>
          <Ionicons name={isPlaying ? "pause" : "play"} size={22} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity onPress={hasNext ? onNext : undefined} style={styles.iconButton} disabled={!hasNext}>
          <Ionicons name="play-skip-forward" size={22} color={hasNext ? "#fff" : "#555"} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 62,        
    left: 10,        
    right: 10,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,15,15,0.85)",
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  thumbnail: { width: 48, height: 48, borderRadius: 10 },
  info: { flex: 1, marginHorizontal: 12 },
  title: { color: "#fff", fontSize: 14, fontWeight: "600" },
  artist: { color: "#ddd", fontSize: 12 },
  iconButton: { paddingHorizontal: 8 },
});