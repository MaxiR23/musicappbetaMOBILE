// app/genre-playlist/[id].tsx
import PlaybackButtons from "@/src/components/features/player/PlaybackButtons";
import AnimatedHeaderTest from "@/src/components/shared/AnimatedHeaderTest";
import TrackActionsSheet from "@/src/components/shared/TrackActionsSheet";
import TrackRow from "@/src/components/shared/TrackRow";
import { PlaylistSkeletonLayout } from "@/src/components/shared/skeletons/Skeleton";
import { useContentPadding } from "@/src/hooks/use-content-padding";
import { useMusic } from "@/src/hooks/use-music";
import { useMusicApi } from "@/src/hooks/use-music-api";
import { formatDurationCustom } from "@/src/utils/durations";
import { upgradeThumbUrl } from "@/src/utils/image-helpers";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const HERO_HEIGHT = 280;

export default function GenrePlaylistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getGenrePlaylistTracks, prefetchSongs } = useMusicApi();
  const { playFromList } = useMusic();
  const contentPadding = useContentPadding();

  const [playlist, setPlaylist] = useState<any | null>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<any | null>(null);

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

  useEffect(() => {
    if (!tracks?.length) return;
    const ids = tracks.map((t: any) => t.track_id).filter(Boolean);
    prefetchSongs(ids.slice(0, 30)).catch(() => { });
  }, [tracks, prefetchSongs]);

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

  const totalDuration = useMemo(() => {
    const totalMs = tracks.reduce((acc, t) => acc + (t.duration_ms || 0), 0);
    return formatDurationCustom(totalMs, { format: 'compact', round: true });
  }, [tracks]);

  const mosaicImages = useMemo(() => {
    return tracks
      .slice(0, 4)
      .map((t: any) => upgradeThumbUrl(t.thumbnail_url, 512) || t.thumbnail_url)
      .filter(Boolean);
  }, [tracks]);

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

  if (error || !playlist) {
    return (
      <>
        <StatusBar barStyle="light-content" />
        <View style={[styles.page, { paddingTop: insets.top + 8 }]}>
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
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: "#0e0e0e" }}>
        <AnimatedHeaderTest
          mosaicImages={mosaicImages}
          title={playlist.title}
          onBackPress={() => router.back()}
          contentContainerStyle={contentPadding}
        >
          <View style={styles.playlistInfo}>
            <Text style={styles.playlistTitle} numberOfLines={2}>
              {playlist.title}
            </Text>
            {!!playlist.description && (
              <Text style={styles.playlistDescription} numberOfLines={2}>
                {playlist.description}
              </Text>
            )}
            <Text style={styles.playlistMeta}>
              {playlist.track_count} canciones • {totalDuration}
            </Text>
          </View>

          <PlaybackButtons onPlay={handlePlayAll} onShuffle={handleShuffleAll} />

          <View style={{ paddingHorizontal: 16 }}>
            {mappedSongs.map((item, index) => (
              <TrackRow
                key={item.id || index.toString()}
                index={index + 1}
                title={item.title}
                artist={item.artist}
                thumbnail={item.thumbnail}
                trackId={item.id}
                showIndex={false}
                onPress={() => handleTrackPress(index)}
                onMorePress={() => handleTrackMorePress(item)}
              />
            ))}
          </View>
        </AnimatedHeaderTest>
      </SafeAreaView>

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

  playlistInfo: {
    paddingHorizontal: 16,
    marginBottom: 8,
    alignItems: "center",
  },

  playlistTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginBottom: 6,
  },

  playlistDescription: {
    fontSize: 14,
    color: "#ddd",
    textAlign: "center",
    marginBottom: 6,
  },

  playlistMeta: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
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