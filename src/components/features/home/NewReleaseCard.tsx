// components/NewReleaseCard.tsx
import { getUpgradedThumb } from "@/src/utils/image-helpers";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface NewReleaseCardProps {
  release: {
    id: string;
    title: string;
    artist?: string;
    release_date?: string;
    track_count?: number | null;
    thumb?: string | null;
    thumbnails?: any[];
  };
  onPress: () => void;
  badgeText?: string;
}

export default function NewReleaseCard({
  release,
  onPress,
  badgeText = "Nuevo lanzamiento",
}: NewReleaseCardProps) {
  const cover = getUpgradedThumb(release, 256);

  return (
    <View style={styles.cardWrap}>
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
        {/* Badge arriba */}
        <View style={styles.headerRow}>
          <View style={styles.badge}>
            <Ionicons name="sparkles" size={11} color="#111" />
            <Text style={styles.badgeText}>{badgeText}</Text>
          </View>
        </View>

        {/* Contenido: cover + info + chevron */}
        <View style={styles.contentRow}>
          {cover ? (
            <Image source={{ uri: cover }} style={styles.cover} />
          ) : (
            <View style={[styles.cover, { backgroundColor: "#0e0e0e" }]} />
          )}

          <View style={styles.infoCol}>
            <Text style={styles.title} numberOfLines={1}>
              {release.title}
            </Text>
            {!!release.artist && (
              <Text style={styles.artist} numberOfLines={1}>
                {release.artist}
              </Text>
            )}
            {!!release.release_date && (
              <Text style={styles.meta} numberOfLines={1}>
                {release.release_date} · {release.track_count ?? "—"} tracks
              </Text>
            )}
          </View>

          <View style={styles.chevronBox}>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  card: {
    backgroundColor: "#161616",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#242424",
    padding: 10,
    gap: 8,
    // Sombra sutil
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ffd54a",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#111",
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cover: {
    width: 72,
    height: 72,
    borderRadius: 12,
  },
  infoCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
  artist: {
    color: "#ddd",
    fontSize: 14,
  },
  meta: {
    color: "#9aa",
    fontSize: 12,
  },
  chevronBox: {
    alignSelf: "center",
    backgroundColor: "#2a2a2a",
    borderRadius: 999,
    padding: 6,
  },
});