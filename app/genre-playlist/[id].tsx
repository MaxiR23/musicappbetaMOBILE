// app/genre-playlist/[id].tsx
import PlaybackButtons from "@/src/components/features/player/PlaybackButtons";
import PlaylistHeader from "@/src/components/features/playlist/PlaylistHeader";
import BackButton from "@/src/components/shared/BackButton";
import TrackActionsSheet from "@/src/components/shared/TrackActionsSheet";
import TrackRow from "@/src/components/shared/TrackRow";
import { PlaylistSkeletonLayout } from "@/src/components/shared/skeletons/Skeleton";
import { useMusic } from "@/src/hooks/use-music";
import { useMusicApi } from "@/src/hooks/use-music-api";
import { formatDurationCustom } from "@/src/utils/durations";
import { upgradeThumbUrl } from "@/src/utils/image-helpers";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
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
        const result = await getGenrePlaylistTracks(id);

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
    prefetchSongs(ids.slice(0, 30)).catch(() => { });
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
    return formatDurationCustom(totalMs, { format: 'compact', round: true });
  }, [tracks]);

  // Extraer los primeros 4 thumbnails para el mosaico
  const mosaicImages = useMemo(() => {
    return tracks
      .slice(0, 4)
      .map((t: any) => upgradeThumbUrl(t.thumbnail_url, 512) || t.thumbnail_url)
      .filter(Boolean);
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
            <BackButton
              absolute={false}
              withBackground={false}
              icon="chevron-back"
              iconSize={22}
              width={36}
              height={36}
            />
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
          <BackButton
            absolute={false}
            withBackground={false}
            icon="chevron-back"
            iconSize={22}
            width={36}
            height={36}
          />
          <View style={{ flex: 1 }} />
          <View style={styles.backBtn} />
        </View>

        <FlatList
          data={mappedSongs}
          keyExtractor={(item, idx) => item.id || idx.toString()}
          ListHeaderComponent={
            <>
              {/* Header simple */}
              <PlaylistHeader
                variant="simple"
                playlist={{
                  name: playlist.title,
                  songCount: playlist.track_count,
                  duration: totalDuration,
                }}
                mosaicImages={mosaicImages}
                showBackButton={false}
              />

              {/* Botones */}
              <PlaybackButtons onPlay={handlePlayAll} onShuffle={handleShuffleAll} />
            </>
          }
          renderItem={({ item, index }) => (
            <View style={{ paddingHorizontal: 16 }}>
              <TrackRow
                index={index + 1}
                title={item.title}
                artist={item.artist}
                thumbnail={item.thumbnail}
                trackId={item.id}
                showIndex={false}
                onPress={() => handleTrackPress(index)}
                onMorePress={() => handleTrackMorePress(item)}
              />
            </View>
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