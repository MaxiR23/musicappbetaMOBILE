//app/playlist/[id].tsx 
import PlaylistEditView from "@/src/components/features/playlist/PlaylistEditView";
import PlaylistNormalView from "@/src/components/features/playlist/PlaylistNormalView";
import PlaylistOptionsSheet from "@/src/components/features/playlist/PlaylistOptionsSheet";
import TrackActionsSheet from "@/src/components/shared/TrackActionsSheet";
import { PlaylistSkeletonLayout } from "@/src/components/shared/skeletons/Skeleton";
import { useCacheInvalidation } from "@/src/hooks/use-cache-invalidation";
import { useDetailScreen } from "@/src/hooks/use-detail-screen";
import { useMusic } from "@/src/hooks/use-music";
import { useMusicApi } from "@/src/hooks/use-music-api";
import { usePlaylistEditor } from "@/src/hooks/use-playlist-editor";
import { useUserProfile } from "@/src/hooks/use-user-profile";
import { formatDuration, parseDurationToMs } from "@/src/utils/durations";
import { upgradeThumbUrl } from "@/src/utils/image-helpers";
import { emitPlaylistChange } from "@/src/utils/playlist-events";
import { applyServerOrder } from "@/src/utils/reorder-logger";
import { mapPlaylistSongs } from "@/src/utils/song-mapper";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const HERO_HEIGHT = 320;

export default function PlaylistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getPlaylistById, prefetchSongs, deletePlaylist, removeTrackFromPlaylist } = useMusicApi();
  const { playFromList } = useMusic();
  const { userId } = useUserProfile();
  const { invalidatePlaylists } = useCacheInvalidation(userId);

  // Estado principal
  const [playlist, setPlaylist] = useState<any | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<any | null>(null);

  // Hook de edición
  const {
    editMode,
    editSongs,
    startEdit,
    cancelEdit,
    saveEdits,
    handleInlineRemove,
    handleReorder,
  } = usePlaylistEditor(playlist);

  // Carga de datos con transformación
  const { data, loading } = useDetailScreen({
    id,
    fetcher: getPlaylistById,
    transformer: (rawData) => {
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

      return {
        id: rawData.id,
        name: rawData.title,
        description: rawData.description,
        isPublic: rawData.is_public,
        songCount: songs.length,
        duration: formatDuration(totalMs),
        songs,
      };
    },
  });

  useEffect(() => {
    if (data) setPlaylist(data);
  }, [data]);

  useEffect(() => {
    if (!playlist?.songs?.length) return;
    const ids = playlist.songs.map((s: any) => s.id).filter(Boolean);
    prefetchSongs(ids.slice(0, 30)).catch(() => { });
  }, [playlist, prefetchSongs]);

  const mappedSongs = useMemo(() => {
    if (!playlist) return [];
    return mapPlaylistSongs(playlist.songs);
  }, [playlist]);

  const mosaicImages: string[] = useMemo(() => {
    return (playlist?.songs || []).map((s: any) => s.albumCover).filter(Boolean);
  }, [playlist]);

  // Handlers
  const handlePlayAll = () => {
    if (!mappedSongs.length) return;
    playFromList(mappedSongs, 0, { type: "playlist", name: playlist!.name });
  };

  const handleShuffleAll = () => {
    if (!mappedSongs.length) return;
    const shuffled = [...mappedSongs].sort(() => Math.random() - 0.5);
    playFromList(shuffled, 0, { type: "playlist", name: playlist!.name });
  };

  const confirmDelete = () => {
    if (!playlist) return;
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
              emitPlaylistChange();
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
      emitPlaylistChange();
      invalidatePlaylists().catch(() => { });
    }
  };

  const handleRemoveInline = async (internalId: string | number) => {
    const result = await handleInlineRemove(internalId);
    if (result) {
      setPlaylist((prev: any) => (prev ? { ...prev, ...result } : prev));
      emitPlaylistChange();
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
              duration: formatDuration(nextTotalMs),
            };
          })()
          : prev
      );

      emitPlaylistChange();
      invalidatePlaylists().catch(() => { });
    } catch (e: any) {
      Alert.alert("Error", e?.message || "No se pudo quitar el tema.");
    }
  };

  // Loading state
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

  // Not found state
  if (!playlist) {
    return (
      <View style={[styles.page, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: "#fff" }}>No se encontró la playlist.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: "#4facfe" }}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      {/* Vista principal (normal o edición) */}
      {editMode ? (
        <PlaylistEditView
          playlist={playlist}
          mosaicImages={mosaicImages}
          editSongs={editSongs}
          onSave={handleSaveEdit}
          onCancel={cancelEdit}
          onReorder={handleReorderTracks}
          onRemove={handleRemoveInline}
          onMenuPress={() => setMenuOpen(true)}
        />
      ) : (
        <PlaylistNormalView
          playlist={playlist}
          mosaicImages={mosaicImages}
          mappedSongs={mappedSongs}
          onPlayAll={handlePlayAll}
          onShuffleAll={handleShuffleAll}
          onTrackPress={(index) =>
            playFromList(mappedSongs, index, { type: "playlist", name: playlist.name })
          }
          onTrackMorePress={(track) => {
            setSelectedTrack(track);
            setSheetOpen(true);
          }}
          onMenuPress={() => setMenuOpen(true)}
        />
      )}

      {/* Menú superior */}
      <PlaylistOptionsSheet
        open={menuOpen}
        onOpenChange={setMenuOpen}
        onDelete={confirmDelete}
        onEdit={editMode ? undefined : handleStartEdit}
        editMode={editMode}
      />

      {/* Sheet de acciones de track */}
      <TrackActionsSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        track={selectedTrack}
        onRemove={(_, trackId) => handleRemoveFromSheet(playlist.id, trackId)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#0e0e0e",
  },
});