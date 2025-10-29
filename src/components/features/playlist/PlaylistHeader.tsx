// components/playlist/PlaylistHeader.tsx
import PlaylistCover from "@/src/components/features/playlist/PlaylistCover";
import { SCRIM_GRADIENT } from "@/src/utils/colorUtils.native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { ImageBackground, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BackButton from "../../shared/BackButton";

const HERO_HEIGHT_DEFAULT = 320;
const HERO_HEIGHT_SIMPLE = 280;

interface PlaylistHeaderProps {
  playlist: {
    name: string;
    description?: string;
    isPublic?: boolean;
    songCount: number;
    duration: string;
    songs?: any[];
  };
  mosaicImages?: string[];
  onMenuPress?: () => void;
  showBackButton?: boolean;
  variant?: "default" | "simple";
}

export default function PlaylistHeader({
  playlist,
  mosaicImages = [],
  onMenuPress,
  showBackButton = true,
  variant = "default",
}: PlaylistHeaderProps) {
  const heroBg = mosaicImages[0] || undefined;
  const insets = useSafeAreaInsets();
  const heroHeight = variant === "simple" ? HERO_HEIGHT_SIMPLE : HERO_HEIGHT_DEFAULT;

  // Render simple variant (centrado, minimal - para genre/featured)
  if (variant === "simple") {
    return (
      <View style={[styles.heroSimple, { paddingTop: 20 }]}>
        {/* Cover: mosaico si tiene 4+, single si tiene 1-3, placeholder si está vacío */}
        <PlaylistCover 
          images={mosaicImages} 
          size={200} 
          borderRadius={8} 
        />

        {/* Info centrada */}
        <Text style={styles.simpleTitle} numberOfLines={2}>
          {playlist.name}
        </Text>
        <Text style={styles.simpleMeta}>
          {playlist.songCount} canciones
        </Text>
      </View>
    );
  }

  // Render default variant (horizontal, con blur - para playlists del usuario)
  return (
    <View style={{ height: heroHeight, backgroundColor: "#111" }}>
      {heroBg ? (
        <ImageBackground
          source={{ uri: heroBg }}
          style={StyleSheet.absoluteFill}
          blurRadius={40}
          resizeMode="cover"
        >
          <LinearGradient
            colors={SCRIM_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </ImageBackground>
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "#111" }]} />
      )}

      {/* Top buttons */}
      {showBackButton && <BackButton />}

      {onMenuPress && (
        <TouchableOpacity 
          style={[styles.moreButtonTop, { top: insets.top + 8 }]}
          onPress={onMenuPress}
        >
          <Ionicons name="ellipsis-vertical" size={18} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Cover + metadata horizontal */}
      <View style={styles.heroBottom}>
        <PlaylistCover images={mosaicImages} size={120} borderRadius={12} />
        <View style={{ marginLeft: 14, flex: 1 }}>
          <Text style={styles.playlistType}>
            {playlist.isPublic ? "PLAYLIST PÚBLICA" : "PLAYLIST PRIVADA"}
          </Text>
          <Text style={styles.title} numberOfLines={2}>
            {playlist.name}
          </Text>
          {!!playlist.description && (
            <Text style={styles.subtitle} numberOfLines={2}>
              {playlist.description}
            </Text>
          )}
          <Text style={styles.meta}>
            {playlist.songCount} canciones • {playlist.duration}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Estilos default variant
  moreButtonTop: {
    position: "absolute",
    right: 20,
    backgroundColor: "#0008",
    padding: 8,
    borderRadius: 20,
  },
  heroBottom: {
    position: "absolute",
    bottom: 14,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  playlistType: { color: "#ccc", fontSize: 12, marginBottom: 2 },
  title: { color: "#fff", fontSize: 22, fontWeight: "800" },
  subtitle: { color: "#ddd", fontSize: 13, marginTop: 2 },
  meta: { color: "#bbb", fontSize: 12, marginTop: 6 },

  // Estilos simple variant
  heroSimple: {
    paddingHorizontal: 20,
    alignItems: "center",
  },
  simpleTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  simpleMeta: {
    fontSize: 13,
    color: "#888",
    marginBottom: 4,
  },
});