// components/playlist/PlaylistHeader.tsx
import PlaylistCover from "@/components/features/playlist/PlaylistCover";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BackButton from "../../shared/BackButton";

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
}

export default function PlaylistHeader({
  playlist,
  mosaicImages = [],
  onMenuPress,
  showBackButton = true,
}: PlaylistHeaderProps) {
  const { t } = useTranslation("playlist");
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.hero, { paddingTop: insets.top + 60 }]}>
      {/* Botón back */}
      {showBackButton && <BackButton />}

      {/* Botón de menú */}
      {onMenuPress && (
        <TouchableOpacity 
          style={[styles.menuButton, { top: insets.top + 8 }]}
          onPress={onMenuPress}
        >
          <View style={styles.menuButtonCircle}>
            <Ionicons name="ellipsis-vertical" size={18} color="#fff" />
          </View>
        </TouchableOpacity>
      )}

      {/* Cover */}
      <PlaylistCover 
        images={mosaicImages} 
        size={200} 
        borderRadius={8} 
      />

      {/* Título */}
      <Text style={styles.title} numberOfLines={2}>
        {playlist.name}
      </Text>

      {/* Badge público/privado */}
      {playlist.isPublic !== undefined && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {playlist.isPublic ? t("info.public") : t("info.private")}
          </Text>
        </View>
      )}

      {/* Meta */}
      <Text style={styles.meta}>
        {t("info.songCount", { count: playlist.songCount })} • {playlist.duration}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: 20,
    alignItems: "center",
    paddingBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginTop: 16,
  },
  meta: {
    fontSize: 13,
    color: "#888",
    marginTop: 4,
  },
  menuButton: {
    position: "absolute",
    right: 16,
    zIndex: 10,
  },
  menuButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    marginTop: 4,
    marginBottom: 2,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
});