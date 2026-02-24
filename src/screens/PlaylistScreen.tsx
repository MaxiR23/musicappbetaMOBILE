import PlaybackButtons from "@/src/components/features/player/PlaybackButtons";
import PlaylistEditView from "@/src/components/features/playlist/PlaylistEditView";
import PlaylistOptionsSheet from "@/src/components/features/playlist/PlaylistOptionsSheet";
import AnimatedDetailHeader from "@/src/components/shared/AnimatedDetailHeader";
import TrackActionsSheet from "@/src/components/shared/TrackActionsSheet";
import TrackRow from "@/src/components/shared/TrackRow";
import { PlaylistSkeletonLayout } from "@/src/components/shared/skeletons/Skeleton";
import { useCacheInvalidation } from "@/src/hooks/use-cache-invalidation";
import { useContentPadding } from "@/src/hooks/use-content-padding";
import { useMusic } from "@/src/hooks/use-music";
import { useMusicApi } from "@/src/hooks/use-music-api";
import { usePlaylistEditor } from "@/src/hooks/use-playlist-editor";
import { useUserProfile } from "@/src/hooks/use-user-profile";
import { formatDurationCustom, parseDurationToMs } from "@/src/utils/durations";
import { upgradeThumbUrl } from "@/src/utils/image-helpers";
import { applyServerOrder } from "@/src/utils/reorder-logger";
import { mapPlaylistSongs } from "@/src/utils/song-mapper";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useSegments } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

export default function PlaylistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const segments = useSegments() as string[];
  const contentPadding = useContentPadding();

  const {
    getPlaylistById,
    getGenrePlaylistTracks,
    prefetchSongs,
    deletePlaylist,
    removeTrackFromPlaylist
  } = useMusicApi();
  const { playFromList } = useMusic();
  const { userId } = useUserProfile();
  const { invalidatePlaylists } = useCacheInvalidation(userId);

  const isGenrePlaylist = segments.includes('genre-playlist');

  const [playlist, setPlaylist] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<any | null>(null);

  const {
    editMode,
    editSongs,
    startEdit,
    cancelEdit,
    saveEdits,
    handleInlineRemove,
    handleReorder,
  } = usePlaylistEditor(playlist);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!id) return;
      setLoading(true);
      setError(null);

      try {
        if (isGenrePlaylist) {
          const result = await getGenrePlaylistTracks(id);
          if (mounted) {
            if (result?.ok) {
              const totalMs = (result.tracks || []).reduce(
                (acc: number, t: any) => acc + (t?.duration_ms ?? 0),
                0
              );

              const songs = (result.tracks || []).map((t: any, idx: number) => ({
                id: t.track_id,
                internalId: t.id,
                title: t.title,
                artist: t.artist,
                artistId: t.artist_id ?? null,
                albumId: t.album ?? null,
                duration: t.duration_ms
                  ? `${Math.floor(t.duration_ms / 60000)}:${String(
                    Math.floor((t.duration_ms % 60000) / 1000)
                  ).padStart(2, "0")}`
                  : "--:--",
                albumCover: upgradeThumbUrl(t.thumbnail_url, 512) || t.thumbnail_url || undefined,
                _i: idx + 1,
              }));

              setPlaylist({
                id: result.playlist.id,
                name: result.playlist.title,
                songCount: songs.length,
                duration: formatDurationCustom(totalMs, { format: 'compact', round: true }),
                songs,
              });
            } else {
              setError(result?.error || "Error al cargar playlist");
            }
          }
        } else {
          const rawData = await getPlaylistById(id);
          if (mounted && rawData) {
            const totalMs = (rawData.tracks || []).reduce(
              (acc: number, t: any) => acc + (t?.duration_ms ?? 0),
              0
            );

            const songs = (rawData.tracks || []).map((t: any, idx: number) => ({
              id: t.track_id,
              internalId: t.id,
              title: t.title,
              artist: t.artist,
              artistId: t.artist_id ?? null,
              albumId: t.album ?? null,
              duration: t.duration_ms
                ? `${Math.floor(t.duration_ms / 60000)}:${String(
                  Math.floor((t.duration_ms % 60000) / 1000)
                ).padStart(2, "0")}`
                : "--:--",
              albumCover: upgradeThumbUrl(t.thumbnail_url, 512) || t.thumbnail_url || undefined,
              _i: idx + 1,
            }));

            setPlaylist({
              id: rawData.id,
              name: rawData.title,
              description: rawData.description,
              isPublic: rawData.is_public,
              songCount: songs.length,
              duration: formatDurationCustom(totalMs, { format: 'compact', round: true }),
              songs,
            });
          }
        }
      } catch (err) {
        console.error("[playlist] Error:", err);
        if (mounted) setError("Error al cargar playlist");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [id, isGenrePlaylist, getPlaylistById, getGenrePlaylistTracks]);

  useEffect(() => {
    if (!playlist?.songs?.length) return;
    const ids = playlist.songs.map((s: any) => s.id).filter(Boolean);
    prefetchSongs(ids.slice(0, 30)).catch(() => { });
  }, [playlist, prefetchSongs]);

  const mappedSongs = useMemo(() => {
    if (!playlist) return [];
    return mapPlaylistSongs(playlist.songs);
  }, [playlist]);

  const mosaicImages = useMemo(() => {
    return (playlist?.songs || []).map((s: any) => s.albumCover).filter(Boolean);
  }, [playlist]);

  const sections = useMemo(() => {
    if (!playlist) return [];

    return [
      {
        type: 'info',
        data: playlist,
      },
      {
        type: 'buttons',
        data: null,
      },
      ...(playlist.songs || []).map((song: any, index: number) => ({
        type: 'track',
        data: song,
        index,
      })),
    ];
  }, [playlist]);

  const handlePlayAll = () => {
    if (!mappedSongs.length) return;
    playFromList(mappedSongs, 0, { type: "playlist", name: playlist!.name });
  };

  const handleShuffleAll = () => {
    if (!mappedSongs.length) return;
    const shuffled = [...mappedSongs].sort(() => Math.random() - 0.5);
    playFromList(shuffled, 0, { type: "playlist", name: playlist!.name });
  };

  const handleTrackPress = (index: number) => {
    playFromList(mappedSongs, index, { type: "playlist", name: playlist!.name });
  };

  const handleTrackMorePress = (track: any) => {
    setSelectedTrack(track);
    setSheetOpen(true);
  };

  const confirmDelete = () => {
    if (!playlist || isGenrePlaylist) return;
    Alert.alert(
      "Eliminar playlist",
      `¿Seguro que querés eliminar "${playlist.name}"? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deletePlaylist(playlist.id);
              await invalidatePlaylists();
              setMenuOpen(false);
              router.back();
            } catch (e: any) {
              Alert.alert("Error", e?.message || "No se pudo eliminar la playlist.");
            }
          },
        },
      ]
    );
  };

  const handleStartEdit = () => {
    startEdit();
    setMenuOpen(false);
  };

  const handleSaveEdit = () => {
    const newSongs = saveEdits();
    if (newSongs) {
      setPlaylist((prev: any) => (prev ? { ...prev, songs: newSongs } : prev));
      invalidatePlaylists().catch(() => { });
    }
  };

  const handleRemoveInline = async (internalId: string | number) => {
    const result = await handleInlineRemove(internalId);
    if (result) {
      setPlaylist((prev: any) => (prev ? { ...prev, ...result } : prev));
      invalidatePlaylists().catch(() => { });
    }
  };

  const handleReorderTracks = async (fromIndex: number, toIndex: number) => {
    const result = await handleReorder(fromIndex, toIndex);
    if (result?.order) {
      setPlaylist((prev: any) =>
        prev ? { ...prev, songs: applyServerOrder(prev.songs, result.order) } : prev
      );
    }
  };

  const handleRemoveFromSheet = async (playlistId: string, trackIdMaybe: string) => {
    const internalId = String(selectedTrack?.internalId ?? trackIdMaybe);
    try {
      await removeTrackFromPlaylist(playlistId, internalId);

      setPlaylist((prev: any) =>
        prev
          ? (() => {
            const nextSongs = (prev.songs || []).filter(
              (s: any) => String(s.internalId) !== internalId
            );
            const nextTotalMs = nextSongs.reduce(
              (acc: number, s: any) => acc + parseDurationToMs(s.duration),
              0
            );
            return {
              ...prev,
              songs: nextSongs,
              songCount: nextSongs.length,
              duration: formatDurationCustom(nextTotalMs, { format: 'compact', round: true }),
            };
          })()
          : prev
      );

      invalidatePlaylists().catch(() => { });
    } catch (e: any) {
      Alert.alert("Error", e?.message || "No se pudo quitar el tema.");
    }
  };

  if (loading) {
    return (
      <ScrollView style={styles.page} contentContainerStyle={{ paddingBottom: 32 }}>
        <PlaylistSkeletonLayout
          theme={{ baseColor: "#2a2a2a", highlightColor: "#3b3b3b", duration: 1200 }}
          tracks={8}
          heroHeight={280}
        />
      </ScrollView>
    );
  }

  if (error || !playlist) {
    return (
      <>
        <StatusBar barStyle="light-content" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#888" />
          <Text style={styles.errorText}>{error || "No se encontró la playlist"}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  if (editMode && !isGenrePlaylist) {
    return (
      <>
        <PlaylistEditView
          playlist={playlist}
          mosaicImages={mosaicImages}
          editSongs={editSongs}
          contentPadding={contentPadding}
          onSave={handleSaveEdit}
          onCancel={cancelEdit}
          onReorder={handleReorderTracks}
          onRemove={handleRemoveInline}
          onMenuPress={() => setMenuOpen(true)}
        />

        <PlaylistOptionsSheet
          open={menuOpen}
          onOpenChange={setMenuOpen}
          onDelete={confirmDelete}
          onEdit={undefined}
          editMode={editMode}
        />
      </>
    );
  }

  const renderSection = (section: any) => {
    switch (section.type) {
      case 'info':
        return (
          <View style={styles.infoSection}>
            <Text style={styles.playlistTitle} numberOfLines={2}>
              {section.data.name}
            </Text>

            {section.data.isPublic !== undefined && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {section.data.isPublic ? "PÚBLICA" : "PRIVADA"}
                </Text>
              </View>
            )}

            <Text style={styles.meta}>
              {section.data.songCount} canciones • {section.data.duration}
            </Text>
          </View>
        );

      case 'buttons':
        return <PlaybackButtons onPlay={handlePlayAll} onShuffle={handleShuffleAll} />;

      case 'track':
        return (
          <View style={{ paddingHorizontal: 16 }}>
            <TrackRow
              index={section.index + 1}
              title={section.data.title}
              artist={section.data.artist}
              thumbnail={section.data.albumCover}
              trackId={section.data.id}
              showIndex={false}
              onPress={() => handleTrackPress(section.index)}
              onMorePress={() => handleTrackMorePress(section.data)}
            />
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" />

      <AnimatedDetailHeader
        mosaicImages={mosaicImages}
        title={playlist.name}
        sections={sections}
        renderSection={renderSection}
        onBackPress={() => router.back()}
        onMenuPress={isGenrePlaylist ? undefined : () => setMenuOpen(true)}
        contentContainerStyle={contentPadding}
      />

      {!isGenrePlaylist && (
        <PlaylistOptionsSheet
          open={menuOpen}
          onOpenChange={setMenuOpen}
          onDelete={confirmDelete}
          onEdit={editMode || playlist.songs.length === 1 ? undefined : handleStartEdit}
          editMode={editMode}
        />
      )}

      <TrackActionsSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        playlistId={!isGenrePlaylist ? playlist.id : undefined}
        track={selectedTrack}
        onRemove={!isGenrePlaylist ? (_, trackId) => handleRemoveFromSheet(playlist.id, trackId) : undefined}
        showAddTo={!isGenrePlaylist}
        showRemove={!isGenrePlaylist}
      />
    </>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#0e0e0e",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
    backgroundColor: "#0e0e0e",
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

  infoSection: {
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  playlistTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
  },
  badge: {
    marginBottom: 8,
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
  meta: {
    fontSize: 13,
    color: "#888",
  },
});