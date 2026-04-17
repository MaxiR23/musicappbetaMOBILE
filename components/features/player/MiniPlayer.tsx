import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

interface MiniPlayerProps {
  thumbUrl: string;
  title: string;
  artist_name: string;
  gradient: [string, string];
  isPlaying: boolean;
  hasNext: boolean;
  onExpand: () => void;
  onArtistPress: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
}

export const MiniPlayer = React.memo(function MiniPlayer({
  thumbUrl,
  title,
  artist_name,
  gradient,
  isPlaying,
  hasNext,
  onExpand,
  onArtistPress,
  onTogglePlay,
  onNext,
}: MiniPlayerProps) {
  const lastGradientRef = useRef<[string, string]>(gradient);
  const [gradients, setGradients] = useState<{ prev: [string, string]; curr: [string, string] }>({
    prev: gradient,
    curr: gradient,
  });
  const opacity = useSharedValue(1);

  useEffect(() => {
    const prev = lastGradientRef.current;
    lastGradientRef.current = gradient;
    setGradients({ prev, curr: gradient });
    opacity.value = 0;
    opacity.value = withTiming(1, { duration: 600 });
  }, [gradient[0]]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={[gradients.prev[0], gradients.prev[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        <LinearGradient
          colors={[gradients.curr[0], gradients.curr[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <View style={styles.glassOverlay} />

      <View style={styles.container}>
        <Image source={thumbUrl} style={styles.thumbnail} />

        <View style={styles.info}>
          <Pressable onPress={onExpand} hitSlop={6}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          </Pressable>
          <Pressable onPress={onArtistPress} style={{ alignSelf: "flex-start" }}>
            <Text style={styles.artist} numberOfLines={1}>
              {artist_name}
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
},
(prev, next) =>
  prev.thumbUrl === next.thumbUrl &&
  prev.title === next.title &&
  prev.artist_name === next.artist_name &&
  prev.gradient[0] === next.gradient[0] &&
  prev.gradient[1] === next.gradient[1] &&
  prev.isPlaying === next.isPlaying &&
  prev.hasNext === next.hasNext
);

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
    backgroundColor: "rgba(15,15,15,0.55)",
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