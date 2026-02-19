import { useIsTrackPlaying } from "@/src/hooks/use-is-track-playing";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import PlayingIndicator from "./PlayingIndicator";


/**
 * Props del componente TrackRow:
 * - index: Número de track (1-based).
 * - title: Título de la canción.
 * - artist: Nombre del/los artista(s) (opcional).
 * - thumbnail: URL del thumbnail/cover (opcional).
 * - duration: Duración en formato "mm:ss" (opcional).
 * - onPress: Callback al hacer tap en la fila.
 * - onMorePress: Callback al hacer tap en el botón de más opciones (opcional).
 * - showThumbnail: Mostrar thumbnail (default: true).
 * - showMoreButton: Mostrar botón de más opciones (default: true).
 * - showDuration: Mostrar duración (default: false).
 * - showIndex: Mostrar índice (opcional; si no se pasa, depende del componente).
 * - trackId: ID del track (para animación/estado de reproducción).
 */
interface TrackRowProps {
  index: number;
  title: string;
  artist?: string;
  thumbnail?: string;
  duration?: string;

  onPress: () => void;
  onMorePress?: () => void;

  showThumbnail?: boolean;
  showMoreButton?: boolean;
  showDuration?: boolean;
  showIndex?: boolean;

  trackId: string | number;
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
  showIndex = true, //por defecto mostrar indice.
  trackId,
}: TrackRowProps) {

  const { isCurrentTrack, isPlaying } = useIsTrackPlaying(trackId);

  return (
    <View style={styles.container}>
      {/* Índice o Thumbnail con overlay */}
      {showIndex ? (
        // Caso 1: Mostrar índice (como álbumes/artistas)
        <>
          <View style={styles.indexContainer}>
            {isCurrentTrack ? (
              <PlayingIndicator color="#b0b0b0" size={14} isPlaying={isPlaying} />
            ) : (
              <Text style={styles.index}>{index}</Text>
            )}
          </View>

          {showThumbnail && (
            <View style={styles.thumbnailBox}>
              {thumbnail ? (
                <Image source={{ uri: thumbnail }} style={styles.thumbnail} />
              ) : (
                <View style={[styles.thumbnail, styles.thumbnailPlaceholder]} />
              )}
            </View>
          )}
        </>
      ) : (
        // Caso 2: Sin índice, indicador sobre thumbnail (como playlists)
        showThumbnail && (
          <View style={styles.thumbnailBox}>
            {thumbnail ? (
              <Image source={{ uri: thumbnail }} style={styles.thumbnail} />
            ) : (
              <View style={[styles.thumbnail, styles.thumbnailPlaceholder]} />
            )}

            {/* Overlay + Indicador cuando está sonando */}
            {isCurrentTrack && (
              <View style={styles.thumbnailOverlay}>
                <PlayingIndicator color="#fff" size={16} isPlaying={isPlaying} />
              </View>
            )}
          </View>
        )
      )}

      {/* Info (título + artista) - clickeable */}
      <TouchableOpacity
        style={styles.infoContainer}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <Text
          style={[
            styles.title,
            isCurrentTrack && styles.titlePlaying
          ]}
          numberOfLines={1}
        >
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
    position: "relative",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  thumbnailPlaceholder: {
    backgroundColor: "#333",
  },
  thumbnailOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
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
  titlePlaying: {
    color: "#b0b0b0",
    fontWeight: "700",
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