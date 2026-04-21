import PlaybackButtons from "@/components/features/player/PlaybackButtons";
import PlaylistEditView from "@/components/features/playlist/PlaylistEditView";
import PlaylistOptionsSheet from "@/components/features/playlist/PlaylistOptionsSheet";
import AnimatedDetailHeader from "@/components/shared/AnimatedDetailHeader";
import BeatlyLogo from "@/components/shared/BeatlyLogo";
import ConfirmDialog, { ConfirmAction } from "@/components/shared/ConfirmDialog";
import CreatePlaylistModal from "@/components/shared/CreatePlaylistModal";
import TrackActionsSheet from "@/components/shared/TrackActionsSheet";
import TrackRow from "@/components/shared/TrackRow";
import { PlaylistSkeletonLayout } from "@/components/shared/skeletons/Skeleton";
import { canOffline } from "@/config/feature-flags";
import { useCacheInvalidation } from "@/hooks/use-cache-invalidation";
import { useContentPadding } from "@/hooks/use-content-padding";
import { useImageDominantColor } from "@/hooks/use-image-dominant-color";
import { useLikes } from "@/hooks/use-likes";
import { useMusic } from "@/hooks/use-music";
import { useMusicApi } from "@/hooks/use-music-api";
import { useOfflinePlaylist } from "@/hooks/use-offline-playlist";
import { usePlaylistEditor } from "@/hooks/use-playlist-editor";
import { useUserProfile } from "@/hooks/use-user-profile";
import { formatDurationCustom, parseDurationToMs } from "@/utils/durations";
import { upgradeThumbUrl } from "@/utils/image-helpers";
import { applyServerOrder } from "@/utils/reorder-logger";
import { mapPlaylistSongs } from "@/utils/song-mapper";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

interface PlaylistScreenProps {
  isGenrePlaylist?: boolean;
}

export default function PlaylistScreen({ isGenrePlaylist = false }: PlaylistScreenProps) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const contentPadding = useContentPadding();

  const {
    getPlaylistById,
    getLikedPlaylist,
    getGenrePlaylistTracks,
    prefetchSongs,
    deletePlaylist,
    removeTrackFromPlaylist
  } = useMusicApi();
  const { playList } = useMusic();
  const { userId } = useUserProfile();
  const { invalidatePlaylists } = useCacheInvalidation(userId);
  const { likedIds } = useLikes();

  const isLikedPlaylist = id === "liked";
  const isReadOnly = isGenrePlaylist || isLikedPlaylist;
  const { t } = useTranslation("playlist");
  const { t: tCommon } = useTranslation("common");

  const [playlist, setPlaylist] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<any | null>(null);
  const [editDetailsOpen, setEditDetailsOpen] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMessage, setConfirmMessage] = useState<string | undefined>(undefined);
  const [confirmActions, setConfirmActions] = useState<ConfirmAction[]>([]);

  const isMountedRef = useRef(true);
  const isFirstFocusRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // TEST offline {
  const offlineAllowed = !!userId && canOffline(userId);
  const offlinePlaylistId = isGenrePlaylist ? null : (id ?? null);
  const {
    state: offlineState,
    download: downloadPlaylist,
    cancel: cancelDownload,
    remove: removeOfflinePlaylist,
  } = useOfflinePlaylist(offlinePlaylistId);
  // TEST offline }

  const {
    editMode,
    editSongs,
    startEdit,
    cancelEdit,
    saveEdits,
    handleInlineRemove,
    handleReorder,
  } = usePlaylistEditor(playlist);

  const fetchPlaylist = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (!id) return;

    if (!opts.silent) setLoading(true);
    setError(null);

    try {
      if (isGenrePlaylist) {
        const result = await getGenrePlaylistTracks(id);
        if (!isMountedRef.current) return;

        if (result?.ok) {
          const totalMs = (result.tracks || []).reduce(
            (acc: number, t: any) => acc + ((t?.duration_seconds ?? 0) * 1000),
            0
          );

          const songs = (result.tracks || []).map((t: any, idx: number) => ({
            id: t.track_id,
            internalId: t.id,
            title: t.title,
            artist: t.artist,
            artist_id: t.artist_id,
            album_id: t.album_id,
            album_name: t.album_name,
            duration: t.duration_seconds != null
              ? `${Math.floor(t.duration_seconds / 60)}:${String(
                t.duration_seconds % 60
              ).padStart(2, "0")}`
              : "--:--",
            duration_seconds: t.duration_seconds ?? 0,
            albumCover: upgradeThumbUrl(t.thumbnail_url, 512) || t.thumbnail_url || undefined,
            _i: idx + 1,
          }));

          setPlaylist({
            id: result.playlist.id,
            name: result.playlist.title,
            song_count: songs.length,
            duration: formatDurationCustom(totalMs, { format: 'compact', round: true }),
            songs,
          });
        } else {
          setError(result?.error || t("error.loadFailed"));
        }
      } else if (isLikedPlaylist) {
        const rawData = await getLikedPlaylist();
        if (!isMountedRef.current) return;

        if (rawData) {
          const totalMs = (rawData.tracks || []).reduce(
            (acc: number, t: any) => acc + ((t?.duration_seconds ?? 0) * 1000),
            0
          );

          const songs = (rawData.tracks || []).map((t: any, idx: number) => ({
            id: t.track_id,
            internalId: t.id,
            title: t.title,
            artist: t.artist,
            artist_id: t.artist_id,
            album_id: t.album_id,
            album_name: t.album_name,
            duration: t.duration_seconds != null
              ? `${Math.floor(t.duration_seconds / 60)}:${String(
                t.duration_seconds % 60
              ).padStart(2, "0")}`
              : "--:--",
            duration_seconds: t.duration_seconds ?? 0,
            albumCover: upgradeThumbUrl(t.thumbnail_url, 512) || t.thumbnail_url || undefined,
            _i: idx + 1,
          }));

          setPlaylist({
            id: "liked",
            name: t("liked.title"),
            description: null,
            isPublic: false,
            songCount: songs.length,
            duration: formatDurationCustom(totalMs, { format: 'compact', round: true }),
            songs,
          });
        }
      } else {
        const rawData = await getPlaylistById(id);
        if (!isMountedRef.current) return;

        if (rawData) {
          const totalMs = (rawData.tracks || []).reduce(
            (acc: number, t: any) => acc + ((t?.duration_seconds ?? 0) * 1000),
            0
          );

          const songs = (rawData.tracks || []).map((t: any, idx: number) => ({
            id: t.track_id,
            internalId: t.id,
            title: t.title,
            artist: t.artist,
            artist_id: t.artist_id,
            album_id: t.album_id,
            album_name: t.album_name,
            duration: t.duration_seconds != null
              ? `${Math.floor(t.duration_seconds / 60)}:${String(
                t.duration_seconds % 60
              ).padStart(2, "0")}`
              : "--:--",
            duration_seconds: t.duration_seconds ?? 0,
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
      if (isMountedRef.current) setError("Error al cargar playlist");
    } finally {
      if (isMountedRef.current && !opts.silent) setLoading(false);
    }
  }, [id, isGenrePlaylist, isLikedPlaylist, getPlaylistById, getLikedPlaylist, getGenrePlaylistTracks, t]);

  // Initial load + id change: shows skeleton
  useEffect(() => {
    fetchPlaylist();
  }, [fetchPlaylist]);

  // Silent refetch when screen regains focus (e.g. after adding a track from another screen).
  // Skipped for genre playlists since they're read-only and can't be modified from elsewhere.
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocusRef.current) {
        isFirstFocusRef.current = false;
        return;
      }
      if (isGenrePlaylist) return;
      fetchPlaylist({ silent: true });
    }, [fetchPlaylist, isGenrePlaylist])
  );

  useEffect(() => {
    if (!playlist?.songs?.length) return;
    const ids = playlist.songs.map((s: any) => s.id).filter(Boolean);
    prefetchSongs(ids.slice(0, 30)).catch(() => { });
  }, [playlist, prefetchSongs]);

  const mappedSongs = useMemo(() => {
    if (!playlist) return [];
    const songs = isLikedPlaylist
      ? (playlist.songs || []).filter((s: any) => likedIds.has(s.id))
      : (playlist.songs || []);
    return mapPlaylistSongs(songs);
  }, [playlist, likedIds, isLikedPlaylist]);

  const mosaicImages = useMemo(() => {
    return (playlist?.songs || []).map((s: any) => s.albumCover).filter(Boolean);
  }, [playlist]);

  const { color: dominantColor } = useImageDominantColor(mosaicImages[0] ?? null);

  const sections = useMemo(() => {
    if (!playlist) return [];
    const songs = isLikedPlaylist
      ? (playlist.songs || []).filter((s: any) => likedIds.has(s.id))
      : (playlist.songs || []);
    return [
      { type: 'info', data: { ...playlist, songCount: songs.length } },
      { type: 'buttons', data: null },
      ...songs.map((song: any, index: number) => ({ type: 'track', data: song, index })),
    ];
  }, [playlist, likedIds, isLikedPlaylist]);

  const handlePlayAll = () => {
    if (!mappedSongs.length) return;
    playList(mappedSongs, 0, { type: "playlist", id: playlist!.id, name: playlist!.name });
  };

  const handleShuffleAll = () => {
    if (!mappedSongs.length) return;
    const shuffled = [...mappedSongs].sort(() => Math.random() - 0.5);
    playList(shuffled, 0, { type: "playlist", id: playlist!.id, name: playlist!.name });
  };

  // TEST offline {
  const handleDownloadPress = () => {
    if (!playlist) return;

    if (offlineState.status === "downloading") {
      cancelDownload();
      return;
    }

    if (offlineState.status === "done") {
      setConfirmTitle("Eliminar descarga");
      setConfirmMessage(`¿Querés borrar la descarga de "${playlist.name}"?`);
      setConfirmActions([
        {
          label: "Borrar",
          destructive: true,
          onPress: () => removeOfflinePlaylist(playlist.id),
        },
      ]);
      setConfirmOpen(true);
      return;
    }

    const tracks = (playlist.songs || []).map((s: any) => ({
      track_id: s.id,
      title: s.title,
      artist: s.artist,
      artist_id: s.artist_id ?? "",
      album: s.album_name ?? "",
      album_id: s.album_id ?? "",
      thumbnail_url: s.albumCover ?? "",
      duration_seconds: s.duration_seconds ?? 0,
    }));

    downloadPlaylist(
      {
        playlist_id: playlist.id,
        kind: isLikedPlaylist ? "liked" : "user",
        name: playlist.name,
        thumbnail_url: mosaicImages[0] ?? "",
      },
      tracks
    );
  };
  // TEST offline }

  const handleTrackPress = (index: number) => {
    playList(mappedSongs, index, { type: "playlist", id: playlist!.id, name: playlist!.name });
  };

  const handleTrackMorePress = (track: any) => {
    setSelectedTrack(track);
    setSheetOpen(true);
  };

  const confirmDelete = () => {
    if (!playlist || isReadOnly) return;
    setConfirmTitle(t("delete.title"));
    setConfirmMessage(t("delete.message", { name: playlist.name }));
    setConfirmActions([
      {
        label: t("delete.confirm"),
        destructive: true,
        onPress: async () => {
          try {
            await deletePlaylist(playlist.id);
            await invalidatePlaylists();
            setMenuOpen(false);
            router.back();
          } catch (e: any) {
            Alert.alert("Error", e?.message || t("errors.deleteFailed"));
          }
        },
      },
    ]);
    setMenuOpen(false);
    setConfirmOpen(true);
  };

  const handleStartEdit = () => {
    startEdit();
    setMenuOpen(false);
  };

  const handleEditDetails = () => {
    setMenuOpen(false);
    setEditDetailsOpen(true);
  };

  const handleUpdated = (updated: any) => {
    setPlaylist((prev: any) => prev ? {
      ...prev,
      name: updated.title ?? prev.name,
      description: updated.description ?? prev.description,
      isPublic: updated.is_public ?? prev.isPublic,
    } : prev);
    invalidatePlaylists().catch(() => { });
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
      Alert.alert("Error", e?.message || t("errors.removeFailed"));
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
          <Text style={styles.errorText}>{error || t("error.notFound")}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.retryBtn}>
            <Text style={styles.retryText}>{tCommon("error.goBack")}</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  if (editMode && !isReadOnly) {
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

  // TEST offline {
  const showOfflineButton = offlineAllowed && !isGenrePlaylist;
  const downloadState =
    offlineState.status === "done"
      ? "done"
      : offlineState.status === "downloading"
        ? "downloading"
        : "none";
  // TEST offline }

  const renderSection = (section: any) => {
    switch (section.type) {
      case 'info':
        return (
          <View style={styles.infoSection}>
            <Text style={styles.playlistTitle} numberOfLines={2}>
              {section.data.name}
            </Text>

            {isGenrePlaylist && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <BeatlyLogo size={14} withBackground />
                <Text style={{ fontSize: 13, color: "#aaa", fontWeight: "600" }}>Beatly</Text>
              </View>
            )}

            {!!section.data.description && (
              <Text style={styles.description} numberOfLines={3}>
                {section.data.description}
              </Text>
            )}

            {section.data.isPublic !== undefined && !isLikedPlaylist ? (
              <View style={styles.meta}>
                <Ionicons
                  name={section.data.isPublic ? "lock-open-outline" : "lock-closed-outline"}
                  size={13}
                  color="#888"
                />
                <Text style={styles.metaText}>
                  {t("info.songCount", { count: section.data.songCount })} • {section.data.duration}
                </Text>
              </View>
            ) : (
              <Text style={styles.metaText}>
                {t("info.songCount", { count: section.data.songCount })} • {section.data.duration}
              </Text>
            )}

          </View>
        );

      case 'buttons':
        return (
          <PlaybackButtons
            onPlay={handlePlayAll}
            onShuffle={handleShuffleAll}
            onDownload={showOfflineButton ? handleDownloadPress : undefined}
            downloadState={downloadState}
            downloadProgress={offlineState.progress}
          />
        );

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
        coverImage={isLikedPlaylist ? require("@/assets/images/liked-cover.png") : undefined}
        mosaicImages={isLikedPlaylist ? undefined : mosaicImages}
        title={playlist.name}
        dominantColor={dominantColor}
        sections={sections}
        renderSection={renderSection}
        onBackPress={() => router.back()}
        onMenuPress={isReadOnly ? undefined : () => setMenuOpen(true)}
        contentContainerStyle={contentPadding}
      />

      {!isReadOnly && (
        <PlaylistOptionsSheet
          open={menuOpen}
          onOpenChange={setMenuOpen}
          onDelete={confirmDelete}
          onEdit={editMode || playlist.songs.length <= 1 ? undefined : handleStartEdit}
          onEditDetails={handleEditDetails}
          editMode={editMode}
        />
      )}

      <TrackActionsSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        playlistId={!isReadOnly ? playlist.id : undefined}
        track={selectedTrack}
        onRemove={!isReadOnly ? (_, trackId) => handleRemoveFromSheet(playlist.id, trackId) : undefined}
        showAddTo={isReadOnly}
        showRemove={!isReadOnly}
      />

      {!isReadOnly && (
        <CreatePlaylistModal
          open={editDetailsOpen}
          onOpenChange={setEditDetailsOpen}
          onUpdated={handleUpdated}
          initialData={{
            id: playlist.id,
            name: playlist.name,
            description: playlist.description,
            isPublic: playlist.isPublic,
          }}
        />
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmTitle}
        message={confirmMessage}
        actions={confirmActions}
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
    alignItems: "flex-start",
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  playlistTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    textAlign: "left",
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: "#aaa",
    textAlign: "left",
    marginBottom: 6,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    fontSize: 13,
    color: "#888",
  },
});