// src/components/TrackRow.tsx
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface TrackRowProps {
  /**
   * Número de track (1-based index)
   */
  index: number;

  /**
   * Título de la canción
   */
  title: string;

  /**
   * Nombre del/los artista(s)
   */
  artist?: string;

  /**
   * URL del thumbnail/cover
   */
  thumbnail?: string;

  /**
   * Duración en formato "mm:ss"
   */
  duration?: string;

  /**
   * Callback al hacer tap en la fila
   */
  onPress: () => void;

  /**
   * Callback al hacer tap en el botón de más opciones
   */
  onMorePress?: () => void;

  /**
   * Si se debe mostrar el thumbnail (default: true)
   */
  showThumbnail?: boolean;

  /**
   * Si se debe mostrar el botón de más opciones (default: true)
   */
  showMoreButton?: boolean;

  /**
   * Si se debe mostrar la duración (default: false)
   */
  showDuration?: boolean;
}

/**
 * Componente reutilizable para mostrar una fila de canción/track
 * Usado en AlbumScreen, PlaylistScreen, ArtistScreen, etc.
 */
export default function TrackRow({
  index,
  title,
  artist,
  thumbnail,
  duration,
  onPress,
  onMorePress,
  showThumbnail = true,
  showMoreButton = true,
  showDuration = false,
}: TrackRowProps) {
  return (
    <View style={styles.container}>
      {/* Índice */}
      <View style={styles.indexContainer}>
        <Text style={styles.index}>{index}</Text>
      </View>

      {/* Thumbnail */}
      {showThumbnail && (
        <View style={styles.thumbnailBox}>
          {thumbnail ? (
            <Image source={{ uri: thumbnail }} style={styles.thumbnail} />
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]} />
          )}
        </View>
      )}

      {/* Info (título + artista) - clickeable */}
      <TouchableOpacity
        style={styles.infoContainer}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {!!artist && (
          <Text style={styles.artist} numberOfLines={1}>
            {artist}
          </Text>
        )}
      </TouchableOpacity>

      {/* Duración (opcional) */}
      {showDuration && !!duration && (
        <Text style={styles.duration}>{duration}</Text>
      )}

      {/* Botón más opciones */}
      {showMoreButton && onMorePress && (
        <TouchableOpacity
          onPress={onMorePress}
          style={styles.moreButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="ellipsis-vertical" size={16} color="#bbb" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#222",
  },
  indexContainer: {
    width: 24,
    alignItems: "center",
    marginRight: 6,
  },
  index: {
    color: "#aaa",
    fontSize: 12,
    textAlign: "center",
  },
  thumbnailBox: {
    width: 40,
    height: 40,
    borderRadius: 6,
    overflow: "hidden",
    marginRight: 10,
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  thumbnailPlaceholder: {
    backgroundColor: "#333",
  },
  infoContainer: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  artist: {
    color: "#aaa",
    fontSize: 12,
    marginTop: 2,
  },
  duration: {
    color: "#bbb",
    fontSize: 12,
    width: 50,
    textAlign: "right",
    marginLeft: 10,
  },
  moreButton: {
    marginLeft: 6,
    padding: 4,
  },
});