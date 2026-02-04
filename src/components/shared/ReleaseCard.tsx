// src/components/shared/ReleaseCard.tsx
import PlaylistCover from "@/src/components/features/playlist/PlaylistCover";
import React from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface ReleaseCardProps {
  /** URL de la cover del album/single */
  cover?: string | null;
  /** Array de thumbnails para mosaico (playlists) */
  thumbnails?: string[];
  /** Título del album/single */
  title: string;
  /** Subtítulo (Album • 2024, Single • 2023, etc) */
  subtitle?: string;
  /** Callback al presionar la card */
  onPress: () => void;
}

/**
 * Card reutilizable para mostrar albums/singles/playlists en grid de 2 columnas.
 * Soporta mosaico de thumbnails para playlists.
 * Componente memoizado para optimizar performance en listas largas.
 */
export default React.memo(function ReleaseCard({
  cover,
  thumbnails,
  title,
  subtitle,
  onPress,
}: ReleaseCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.card}
      onPress={onPress}
    >
      <View style={styles.coverWrap}>
        {thumbnails && thumbnails.length > 0 ? (
          <PlaylistCover
            images={thumbnails}
            borderRadius={0}
          />
        ) : cover ? (
          <Image source={{ uri: cover }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverPh]} />
        )}
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {subtitle && (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    flexBasis: "48%",
    maxWidth: "48%",
  },
  coverWrap: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#1a1a1a",
    aspectRatio: 1,
  },
  cover: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  coverPh: {
    backgroundColor: "#333",
  },
  title: {
    color: "#fff",
    fontWeight: "700",
    marginTop: 8,
  },
  subtitle: {
    color: "#aaa",
    fontSize: 12,
    marginTop: 2,
  },
});