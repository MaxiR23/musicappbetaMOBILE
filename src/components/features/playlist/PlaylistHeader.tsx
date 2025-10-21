// components/playlist/PlaylistHeader.tsx
import PlaylistCover from "@/src/components/features/playlist/PlaylistCover";
import { SCRIM_GRADIENT } from "@/src/utils/colorUtils.native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { ImageBackground, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import BackButton from "../../shared/BackButton";

const HERO_HEIGHT = 320;

interface PlaylistHeaderProps {
  playlist: {
    name: string;
    description?: string;
    isPublic: boolean;
    songCount: number;
    duration: string;
    songs: any[];
  };
  mosaicImages: string[];
  onMenuPress: () => void;
  showBackButton?: boolean;
}

export default function PlaylistHeader({
  playlist,
  mosaicImages,
  onMenuPress,
  showBackButton = true,
}: PlaylistHeaderProps) {
  const heroBg = mosaicImages[0] || undefined;

  return (
    <View style={{ height: HERO_HEIGHT, backgroundColor: "#111" }}>
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

      <TouchableOpacity style={styles.moreButtonTop} onPress={onMenuPress}>
        <Ionicons name="ellipsis-vertical" size={18} color="#fff" />
      </TouchableOpacity>

      {/* Cover + metadata */}
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
  moreButtonTop: {
    position: "absolute",
    top: 40,
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
});