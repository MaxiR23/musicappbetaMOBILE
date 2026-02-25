import PlaylistCover from "@/components/features/playlist/PlaylistCover";
import React from "react";
import {
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

/**
 * Props del componente ReleaseCard:
 * - cover: URL de la portada (álbum/single) (opcional).
 * - thumbnails: Lista de thumbnails para mosaico (usado cuando no hay cover, ej: playlists) (opcional).
 * - title: Título del álbum/single/playlist.
 * - subtitle: Texto secundario (ej: "Album • 2024", "Single • 2023") (opcional).
 * - circular: Si la imagen debe ser circular (ej: artistas) (opcional).
 * - onPress: Callback al presionar la card.
 *
 * Nota: normalmente se usa `cover` O `thumbnails`. Si vienen ambos, `cover` suele tener prioridad.
 */
interface ReleaseCardProps {
  cover?: string | null;
  thumbnails?: string[];
  title: string;
  subtitle?: string;
  circular?: boolean;
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
  circular = false,
  onPress,
}: ReleaseCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.card}
      onPress={onPress}
    >
      <View style={[styles.coverWrap, circular && styles.coverCircular]}>
        {thumbnails && thumbnails.length > 0 ? (
          <PlaylistCover
            images={thumbnails}
            borderRadius={circular ? 9999 : 0}
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
  coverCircular: {
    borderRadius: 9999,
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