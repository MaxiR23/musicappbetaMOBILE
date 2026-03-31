import { useIsTrackPlaying } from "@/hooks/use-is-track-playing";
import { useLikes } from "@/hooks/use-likes";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useCallback, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import PlayingIndicator from "./PlayingIndicator";
import TrackActionsSheet from "./TrackActionsSheet";

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
 * - disabled?: boolean; cuando un ID es deshabilitado.
 * - track?: objeto completo del track para TrackActionsSheet (agregar a playlist, compartir, etc).
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
  disabled?: boolean;

  track?: any;
  showGoToArtist?: boolean;
  showGoToAlbum?: boolean;
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
  disabled,
  track,
  showGoToArtist,
  showGoToAlbum,
}: TrackRowProps) {

  const { isCurrentTrack, isPlaying } = useIsTrackPlaying(trackId);
  const { isLiked } = useLikes();
  const liked = isLiked(String(trackId));

  const [actionsOpen, setActionsOpen] = useState(false);

  const handleMorePress = useCallback(() => {
    if (onMorePress) {
      onMorePress();
      return;
    }
    if (track) {
      setActionsOpen(true);
    }
  }, [onMorePress, track]);

  const showMore = showMoreButton && (!!onMorePress || !!track);

  return (
    <>
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
                  <Image source={thumbnail} style={styles.thumbnail} contentFit="cover" />
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
                <Image source={thumbnail} style={styles.thumbnail} contentFit="cover" />
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
          disabled={disabled}
        >
          <Text
            style={[
              styles.title,
              isCurrentTrack && styles.titlePlaying,
              disabled && styles.titleDisabled
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

        {/* likes */}
        {liked && (
          <Ionicons name="heart" size={12} color="#888" style={{ marginLeft: 6 }} />
        )}

        {/* Botón más opciones */}
        {showMore && (
          <TouchableOpacity
            onPress={handleMorePress}
            style={styles.moreButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="ellipsis-vertical" size={16} color="#bbb" />
          </TouchableOpacity>
        )}
      </View>

      {track && (
        <TrackActionsSheet
          open={actionsOpen}
          onOpenChange={setActionsOpen}
          track={track}
          showGoToArtist={showGoToArtist}
          showGoToAlbum={showGoToAlbum}
        />
      )}
    </>
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
  titleDisabled: {
    color: "#555",
  },
});