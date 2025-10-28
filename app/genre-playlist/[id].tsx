// app/genre-playlist/[id].tsx
import TrackActionsSheet from "@/src/components/shared/TrackActionsSheet";
import { PlaylistSkeletonLayout } from "@/src/components/shared/skeletons/Skeleton";
import { useMusic } from "@/src/hooks/use-music";
import { useMusicApi } from "@/src/hooks/use-music-api";
import { formatDuration } from "@/src/utils/durations";
import { upgradeThumbUrl } from "@/src/utils/image-helpers";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const HERO_HEIGHT = 280;

export default function GenrePlaylistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getGenrePlaylistTracks, prefetchSongs } = useMusicApi();
  const { playFromList } = useMusic();

  const [playlist, setPlaylist] = useState<any | null>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<any | null>(null);

  // Cargar playlist y tracks
  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!id) return;

      setLoading(true);
      setError(null);

      try {
        //DBG
        /* console.log("[genre-playlist] Cargando playlist:", id); */
        const result = await getGenrePlaylistTracks(id);

        /* console.log("[genre-playlist] Resultado:", result); */

        if (mounted) {
          if (result?.ok) {
            setPlaylist(result.playlist);
            setTracks(result.tracks || []);
          } else {
            setError(result?.error || "Error al cargar playlist");
          }
        }
      } catch (err) {
        console.error("[genre-playlist] Error:", err);
        if (mounted) {
          setError("Error al cargar playlist");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id, getGenrePlaylistTracks]);

  // Prefetch tracks
  useEffect(() => {
    if (!tracks?.length) return;
    const ids = tracks.map((t: any) => t.track_id).filter(Boolean);
    prefetchSongs(ids.slice(0, 30)).catch(() => {});
  }, [tracks, prefetchSongs]);

  // Mapear tracks a formato de Song
  const mappedSongs = useMemo(() => {
    return tracks.map((t: any, idx: number) => ({
      id: t.track_id,
      title: t.title,
      artist: t.artist,
      artistId: t.artist_id ?? null,
      albumId: t.album ?? null,
      duration: t.duration_ms
        ? `${Math.floor(t.duration_ms / 60000)}:${String(
            Math.floor((t.duration_ms % 60000) / 1000)
          ).padStart(2, "0")}`
        : "--:--",
      thumbnail: upgradeThumbUrl(t.thumbnail_url, 512) || t.thumbnail_url || undefined,
      _i: idx + 1,
    }));
  }, [tracks]);

  // Calcular duración total
  const totalDuration = useMemo(() => {
    const totalMs = tracks.reduce((acc, t) => acc + (t.duration_ms || 0), 0);
    return formatDuration(totalMs);
  }, [tracks]);

  // Handlers
  const handlePlayAll = () => {
    if (!mappedSongs.length) return;
    playFromList(mappedSongs, 0, { type: "playlist", name: playlist?.title || "Playlist" });
  };

  const handleShuffleAll = () => {
    if (!mappedSongs.length) return;
    const shuffled = [...mappedSongs].sort(() => Math.random() - 0.5);
    playFromList(shuffled, 0, { type: "playlist", name: playlist?.title || "Playlist" });
  };

  const handleTrackPress = (index: number) => {
    playFromList(mappedSongs, index, { type: "playlist", name: playlist?.title || "Playlist" });
  };

  const handleTrackMorePress = (track: any) => {
    setSelectedTrack(track);
    setSheetOpen(true);
  };

  // Loading
  if (loading) {
    return (
      <ScrollView style={styles.page} contentContainerStyle={{ paddingBottom: 32 }}>
        <PlaylistSkeletonLayout
          theme={{ baseColor: "#2a2a2a", highlightColor: "#3b3b3b", duration: 1200 }}
          tracks={8}
          heroHeight={HERO_HEIGHT}
        />
      </ScrollView>
    );
  }

  // Error
  if (error || !playlist) {
    return (
      <>
        <StatusBar barStyle="light-content" />
        <View style={[styles.page, { paddingTop: insets.top + 8 }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <View style={styles.backBtn} />
          </View>

          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color="#888" />
            <Text style={styles.errorText}>{error || "No se encontró la playlist"}</Text>
            <TouchableOpacity onPress={() => router.back()} style={styles.retryBtn}>
              <Text style={styles.retryText}>Volver</Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" />
      <View style={[styles.page, { paddingTop: insets.top }]}>
        {/* Header flotante */}
         <View style={[styles.headerRow, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <View style={styles.backBtn} />
        </View>

        <FlatList
          data={mappedSongs}
          keyExtractor={(item, idx) => item.id || idx.toString()}
          ListHeaderComponent={
            <View style={styles.hero}>
              {/* Cover placeholder */}
              <View style={styles.coverPlaceholder}>
                <Ionicons name="musical-notes" size={80} color="#666" />
              </View>

              {/* Info */}
              <Text style={styles.playlistTitle} numberOfLines={2}>
                {playlist.title}
              </Text>
              <Text style={styles.playlistMeta}>
                {playlist.track_count} canciones • {totalDuration}
              </Text>

              {/* Botones */}
              <View style={styles.buttonsRow}>
                <TouchableOpacity style={styles.playBtn} onPress={handlePlayAll}>
                  <Ionicons name="play" size={24} color="#000" />
                  <Text style={styles.playBtnText}>Reproducir</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.shuffleBtn} onPress={handleShuffleAll}>
                  <Ionicons name="shuffle" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          }
          renderItem={({ item, index }) => (
            <Pressable
              style={styles.trackRow}
              onPress={() => handleTrackPress(index)}
            >
              <View style={styles.trackLeft}>
                {item.thumbnail ? (
                  <Image source={{ uri: item.thumbnail }} style={styles.trackThumb} />
                ) : (
                  <View style={[styles.trackThumb, styles.trackThumbPlaceholder]}>
                    <Ionicons name="musical-note" size={20} color="#666" />
                  </View>
                )}

                <View style={styles.trackInfo}>
                  <Text style={styles.trackTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.trackArtist} numberOfLines={1}>
                    {item.artist}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.trackMore}
                onPress={() => handleTrackMorePress(item)}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color="#888" />
              </TouchableOpacity>
            </Pressable>
          )}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      </View>

      {/* Sheet de acciones */}
      <TrackActionsSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        track={selectedTrack}
        hideRemoveOption={true}
      />
    </>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#0e0e0e",
  },

  headerRow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    zIndex: 10,
  },

  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },

  hero: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    alignItems: "center",
  },

  coverPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 8,
    backgroundColor: "#1e1e1e",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  playlistTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
  },

  playlistMeta: {
    fontSize: 14,
    color: "#888",
    marginBottom: 24,
  },

  buttonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  playBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
    gap: 8,
  },

  playBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },

  shuffleBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1e1e1e",
    alignItems: "center",
    justifyContent: "center",
  },

  trackRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  trackLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  trackThumb: {
    width: 48,
    height: 48,
    borderRadius: 4,
  },

  trackThumbPlaceholder: {
    backgroundColor: "#1e1e1e",
    alignItems: "center",
    justifyContent: "center",
  },

  trackInfo: {
    flex: 1,
  },

  trackTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
  },

  trackArtist: {
    fontSize: 13,
    color: "#888",
  },

  trackMore: {
    padding: 8,
  },

  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },

  errorText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
    marginTop: 16,
  },

  retryBtn: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#1e1e1e",
    borderRadius: 8,
  },

  retryText: {
    color: "#fff",
    fontWeight: "600",
  },
});