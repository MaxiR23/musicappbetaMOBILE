// app/playlist/[id].tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  ImageBackground,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import PlaylistCover from "@/src/components/PlaylistCover";
import { PlaylistSkeletonLayout } from "@/src/components/skeletons/Skeleton";
import TrackActionsSheet from "@/src/components/TrackActionsSheet"; // 🆕
import { useMusic } from "@/src/hooks/use-music";
import { useMusicApi } from "@/src/hooks/use-music-api";
import { SCRIM_GRADIENT } from "@/src/utils/colorUtils.native";

const HERO_HEIGHT = 320;

export default function PlaylistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    getPlaylistById,
    prefetchSongs,
    deletePlaylist,
    removeTrackFromPlaylist, // 🆕
  } = useMusicApi();
  const { playFromList } = useMusic();

  const [loading, setLoading] = useState(true);
  const [playlist, setPlaylist] = useState<any | null>(null);

  // menú superior (3 puntitos)
  const [menuOpen, setMenuOpen] = useState(false);
  const openMenu = () => setMenuOpen(true);
  const closeMenu = () => setMenuOpen(false);

  // sheet por-canción 🆕
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<any | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getPlaylistById(id);

      const totalMs = (data.tracks || []).reduce(
        (acc: number, t: any) => acc + (t?.duration_ms ?? 0),
        0
      );

      const formatTotal = (ms: number) => {
        const totalSec = Math.floor(ms / 1000);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        return h > 0
          ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
          : `${m}:${String(s).padStart(2, "0")}`;
      };

      const songs = (data.tracks || []).map((t: any) => ({
        id: t.track_id,
        internalId: t.id, // 🆕 id interno de tabla tracks (lo usa el DELETE)
        title: t.title,
        artist: t.artist,
        artistId: t.artist_id ?? null,
        albumId: t.album ?? null,
        duration: t.duration_ms
          ? `${Math.floor(t.duration_ms / 60000)}:${String(
              Math.floor((t.duration_ms % 60000) / 1000)
            ).padStart(2, "0")}`
          : "--:--",
        albumCover: t.thumbnail_url || undefined,
      }));

      const normalized = {
        id: data.id,
        name: data.title,
        description: data.description,
        isPublic: data.is_public,
        songCount: songs.length,
        duration: formatTotal(totalMs),
        songs,
      };

      setPlaylist(normalized);
    } finally {
      setLoading(false);
    }
  }, [id, getPlaylistById]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    if (!playlist?.songs?.length) return;
    const ids = playlist.songs.map((s: any) => s.id).filter(Boolean);
    prefetchSongs(ids.slice(0, 30)).catch(() => {});
  }, [playlist, prefetchSongs]);

  const mappedSongs = useMemo(() => {
    if (!playlist) return [];
    return playlist.songs.map((s: any) => ({
      id: s.id,
      internalId: s.internalId, // 🆕 mantenerlo para pasar al Sheet
      title: s.title,
      artistName: s.artist,
      artistId: s.artistId ?? null,
      albumId: s.albumId ?? null,
      thumbnail: s.albumCover,
      duration: s.duration,
      durationSeconds: null,
      url: "",
    }));
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

  // Eliminar playlist (submenu superior)
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
              closeMenu();
              router.back();
            } catch (e: any) {
              Alert.alert("Error", e?.message || "No se pudo eliminar la playlist.");
            }
          },
        },
      ]
    );
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

  const mosaicImages: string[] = (playlist.songs || [])
    .map((s: any) => s.albumCover)
    .filter(Boolean);

  const heroBg = mosaicImages[0] || undefined;

  return (
    <>
      <ScrollView style={styles.page} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* HERO */}
        <View style={{ height: HERO_HEIGHT, backgroundColor: "#111" }}>
          {heroBg ? (
            <ImageBackground
              source={{ uri: heroBg }}
              style={StyleSheet.absoluteFill}
              blurRadius={40}
              resizeMode="cover"
            >
              <LinearGradient
                colors={SCRIM_GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </ImageBackground>
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "#111" }]} />
          )}

          {/* Top buttons */}
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.moreButtonTop} onPress={openMenu}>
            <Ionicons name="ellipsis-vertical" size={18} color="#fff" />
          </TouchableOpacity>

          {/* Cover + meta */}
          <View style={styles.heroBottom}>
            <PlaylistCover images={mosaicImages} size={120} borderRadius={12} />
            <View style={{ marginLeft: 14, flex: 1 }}>
              <Text style={styles.playlistType}>
                {playlist.isPublic ? "PLAYLIST PÚBLICA" : "PLAYLIST PRIVADA"}
              </Text>
              <Text style={styles.title} numberOfLines={2}>
                {playlist.name}
              </Text>
              {!!playlist.description && (
                <Text style={styles.subtitle} numberOfLines={2}>
                  {playlist.description}
                </Text>
              )}
              <Text style={styles.meta}>
                {playlist.songCount} canciones • {playlist.duration}
              </Text>
            </View>
          </View>
        </View>

        {/* Botones */}
        <View style={styles.actions}>
          <TouchableOpacity onPress={handlePlayAll} style={styles.softButton} activeOpacity={0.85}>
            <Ionicons name="play" size={18} color="#fff" />
            <Text style={styles.softButtonText}>Reproducir</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleShuffleAll} style={styles.softButtonAlt} activeOpacity={0.85}>
            <Ionicons name="shuffle" size={18} color="#fff" />
            <Text style={styles.softButtonText}>Shuffle</Text>
          </TouchableOpacity>
        </View>

        {/* Lista de canciones */}
        <View style={{ paddingHorizontal: 16 }}>
          {playlist.songs.map((song: any, index: number) => (
            <TouchableOpacity
              key={`${song.id}-${index}`}
              onPress={() =>
                playFromList(mappedSongs, index, { type: "playlist", name: playlist.name })
              }
              style={styles.row}
              activeOpacity={0.85}
            >
              <View style={{ width: 24, alignItems: "center", marginRight: 6 }}>
                <Text style={styles.index}>{index + 1}</Text>
              </View>

              <View style={styles.thumbBox}>
                {song.albumCover ? (
                  <Image source={{ uri: song.albumCover }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, { backgroundColor: "#333" }]} />
                )}
              </View>

              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.songTitle} numberOfLines={1}>
                  {song.title}
                </Text>
                <Text style={styles.songArtist} numberOfLines={1}>
                  {song.artist}
                </Text>
              </View>

              <Text style={styles.duration}>{song.duration}</Text>

              {/* 3 puntitos por canción → abre el Sheet reutilizable */}
              <TouchableOpacity
                style={styles.moreBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => {
                  const t = mappedSongs[index]; // ya incluye internalId
                  setSelectedTrack(t);
                  setSheetOpen(true);
                }}
              >
                <Ionicons name="ellipsis-vertical" size={16} color="#bbb" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Submenú superior (solo eliminar playlist) */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={closeMenu}>
        <TouchableOpacity style={styles.menuBackdrop} activeOpacity={1} onPress={closeMenu} />
        <View style={styles.menuSheet}>
          <TouchableOpacity
            onPress={confirmDelete}
            style={[styles.menuRow, { borderTopLeftRadius: 16, borderTopRightRadius: 16 }]}
            activeOpacity={0.85}
          >
            <Ionicons name="trash-outline" size={18} color="#ff6b6b" />
            <Text style={[styles.menuRowText, { color: "#ff6b6b" }]}>Eliminar playlist</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={closeMenu}
            style={[styles.menuRow, { borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }]}
            activeOpacity={0.85}
          >
            <Ionicons name="close" size={18} color="#ddd" />
            <Text style={styles.menuRowText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Sheet DRY para acciones de track (incluye Quitar de esta playlist) 🆕 */}
      <TrackActionsSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        track={selectedTrack}
        playlistId={playlist.id}
        onRemove={async (playlistId, trackIdMaybe) => {
          // el sheet ya intenta usar internalId; por las dudas, preferimos el que nos pasó el track seleccionado
          const internalId = String(selectedTrack?.internalId ?? trackIdMaybe);
          try {
            await removeTrackFromPlaylist(playlistId, internalId);

            // update optimista: sacar el tema de la lista local por internalId
            setPlaylist((prev: any) =>
              prev
                ? {
                    ...prev,
                    songCount: Math.max(0, (prev.songCount ?? 1) - 1),
                    songs: (prev.songs || []).filter((s: any) => String(s.internalId) !== internalId),
                  }
                : prev
            );
          } catch (e: any) {
            Alert.alert("Error", e?.message || "No se pudo quitar el tema.");
          }
        }}
        // extraActions={[]} // si quisieras ocultar extras, lo podés dejar vacío
      />
    </>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#0e0e0e" },

  backButton: {
    position: "absolute",
    top: 40,
    left: 20,
    backgroundColor: "#0008",
    padding: 8,
    borderRadius: 20,
  },
  moreButtonTop: {
    position: "absolute",
    top: 40,
    right: 20,
    backgroundColor: "#0008",
    padding: 8,
    borderRadius: 20,
  },

  heroBottom: {
    position: "absolute",
    bottom: 14,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  playlistType: { color: "#ccc", fontSize: 12, marginBottom: 2 },
  title: { color: "#fff", fontSize: 22, fontWeight: "800" },
  subtitle: { color: "#ddd", fontSize: 13, marginTop: 2 },
  meta: { color: "#bbb", fontSize: 12, marginTop: 6 },

  actions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: "center",
  },
  softButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.10)",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  softButtonAlt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  softButtonText: { color: "#fff", fontWeight: "600" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#222",
  },
  index: { color: "#aaa", fontSize: 12 },
  thumbBox: { width: 40, height: 40, borderRadius: 6, overflow: "hidden" },
  thumb: { width: "100%", height: "100%", resizeMode: "cover" },
  songTitle: { color: "#fff", fontWeight: "600", fontSize: 14 },
  songArtist: { color: "#aaa", fontSize: 12, marginTop: 2 },
  duration: { color: "#bbb", fontSize: 12, width: 50, textAlign: "right", marginLeft: 10 },
  moreBtn: { marginLeft: 6, padding: 4 },

  // submenu superior
  menuBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  menuSheet: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 20,
    backgroundColor: "#111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222",
  },
  menuRow: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#222",
  },
  menuRowText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});