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
import DragList, { DragListRenderItemInfo } from "react-native-draglist";

import PlaylistCover from "@/src/components/PlaylistCover";
import { PlaylistSkeletonLayout } from "@/src/components/skeletons/Skeleton";
import TrackActionsSheet from "@/src/components/TrackActionsSheet";
import { useMusic } from "@/src/hooks/use-music";
import { useMusicApi } from "@/src/hooks/use-music-api";
import { SCRIM_GRADIENT } from "@/src/utils/colorUtils.native";

const HERO_HEIGHT = 320;

// ===================== LOGS SOLO REORDEN =====================
const RELOG_ENABLED = true;
const rlog = (tag: string, data?: any) => {
  if (!__DEV__ || !RELOG_ENABLED) return;
  try {
    console.log(`REORDER:${tag}`, data ? JSON.stringify(data) : "");
  } catch {
    console.log(`REORDER:${tag}`);
  }
};
const brief = (s: any, i: number) => ({
  i,
  pos1: i + 1,
  id: s?.id,
  internalId: s?.internalId,
  title: s?.title,
});

// Helpers para total y parseo mm:ss / hh:mm:ss
function formatTotal(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}
function parseDurationToMs(d?: string) {
  if (!d || d === "--:--") return 0;
  const parts = d.split(":").map((n) => parseInt(n, 10) || 0);
  if (parts.length === 3) {
    const [h, m, s] = parts;
    return (h * 3600 + m * 60 + s) * 1000;
  }
  const [m, s] = parts;
  return (m * 60 + s) * 1000;
}

// ==== NUEVO: reconciliar con el orden “canónico” que devuelve el backend ====
function applyServerOrder(
  songs: any[],
  order: { internalId: string | number; trackId?: string | number; position: number }[]
) {
  if (!order?.length) return songs;
  const byInternal = new Map(order.map(o => [String(o.internalId), Number(o.position)]));
  const byTrack    = new Map(order.map(o => [String(o.trackId ?? ""), Number(o.position)]));
  const withPos = songs.map((s: any, i: number) => {
    const p1 = byInternal.get(String(s.internalId));
    const p2 = byTrack.get(String(s.id));
    const pos = typeof p1 === "number" ? p1 : (typeof p2 === "number" ? p2 : (i + 1));
    return { s, pos };
  });
  withPos.sort((a, b) => a.pos - b.pos);
  return withPos.map(x => x.s);
}

export default function PlaylistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    getPlaylistById,
    prefetchSongs,
    deletePlaylist,
    removeTrackFromPlaylist,
    moveTrackInPlaylist, // ← reordenar por POSICIONES (1-based)
  } = useMusicApi();
  const { playFromList } = useMusic();

  const [loading, setLoading] = useState(true);
  const [playlist, setPlaylist] = useState<any | null>(null);

  // menú superior (3 puntitos)
  const [menuOpen, setMenuOpen] = useState(false);
  const openMenu = () => setMenuOpen(true);
  const closeMenu = () => setMenuOpen(false);

  // sheet por-canción
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<any | null>(null);

  // edición y estado local para drag
  const [editMode, setEditMode] = useState(false);
  const [editSongs, setEditSongs] = useState<any[]>([]); // snapshot para reordenar en memoria

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getPlaylistById(id);

      const totalMs = (data.tracks || []).reduce(
        (acc: number, t: any) => acc + (t?.duration_ms ?? 0),
        0
      );

      const songs = (data.tracks || []).map((t: any, idx: number) => ({
        id: t.track_id,
        internalId: t.id, // id interno de la fila (DB)
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
        _i: idx + 1,
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
      internalId: s.internalId,
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

  // ====== EDICIÓN ======
  const startEdit = () => {
    if (!playlist) return;
    setEditSongs(playlist.songs.map((s: any) => ({ ...s }))); // snapshot
    setEditMode(true);
    closeMenu();
    rlog("start", {
      count: playlist.songs.length,
      first5: playlist.songs.slice(0, 5).map(brief),
    });
  };
  const cancelEdit = () => {
    setEditMode(false);
    setEditSongs([]);
    rlog("cancel");
  };
  const saveEdits = () => {
    if (!playlist) {
      setEditMode(false);
      return;
    }
    setPlaylist((prev: any) => (prev ? { ...prev, songs: editSongs } : prev));
    setEditMode(false);
    rlog("save", {
      count: editSongs.length,
      first5: editSongs.slice(0, 5).map(brief),
    });
  };

  // eliminar inline (también actualiza snapshot)
  const handleInlineRemove = async (internalId: string | number) => {
    if (!playlist) return;
    try {
      await removeTrackFromPlaylist(playlist.id, String(internalId));

      // Optimista: estado principal
      setPlaylist((prev: any) =>
        prev
          ? (() => {
              const nextSongs = (prev.songs || []).filter(
                (s: any) => String(s.internalId) !== String(internalId)
              );
              const nextTotalMs = nextSongs.reduce(
                (acc: number, s: any) => acc + parseDurationToMs(s.duration),
                0
              );
              return {
                ...prev,
                songs: nextSongs,
                songCount: nextSongs.length,
                duration: formatTotal(nextTotalMs),
              };
            })()
          : prev
      );
      // Y snapshot de edición
      setEditSongs((prev) =>
        prev.filter((s: any) => String(s.internalId) !== String(internalId))
      );
      rlog("remove", { internalId: String(internalId) });
    } catch (e: any) {
      Alert.alert("Error", e?.message || "No se pudo quitar el tema.");
      rlog("remove:error", { msg: e?.message });
    }
  };

  // Logs compactos al cambiar snapshot (máx 20)
  useEffect(() => {
    if (!editMode) return;
    rlog("set", {
      len: (editSongs || []).length,
      first20: (editSongs || []).slice(0, 20).map(brief),
    });
  }, [editSongs, editMode]);

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

  // ================= VISTA NORMAL =================
  if (!editMode) {
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

                {/* 3 puntitos por canción */}
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

        {/* Submenú superior */}
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

            <TouchableOpacity onPress={startEdit} style={[styles.menuRow]} activeOpacity={0.85}>
              <Ionicons name="create-outline" size={18} color="#ddd" />
              <Text style={styles.menuRowText}>Editar</Text>
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

        {/* Sheet acciones de track */}
        <TrackActionsSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          track={selectedTrack}
          playlistId={playlist.id}
          onRemove={async (playlistId, trackIdMaybe) => {
            const internalId = String(selectedTrack?.internalId ?? trackIdMaybe);
            try {
              await removeTrackFromPlaylist(playlistId, internalId);

              // ✅ Actualización optimista
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
                        duration: formatTotal(nextTotalMs),
                      };
                    })()
                  : prev
              );
            } catch (e: any) {
              Alert.alert("Error", e?.message || "No se pudo quitar el tema.");
            }
          }}
        />
      </>
    );
  }

  // ================= MODO EDICIÓN (Drag & Drop) =================

  const keyExtractor = (item: any, i: number) =>
    String(item?.internalId ?? item?.id ?? i);

  return (
    <>
      {/* Header fijo (Hero + barra Guardar/Cancelar) */}
      <View style={styles.page}>
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
                {editSongs.length} canciones • {playlist.duration}
              </Text>
            </View>
          </View>
        </View>

        {/* Barra de edición */}
        <View style={styles.editBar}>
          <TouchableOpacity style={styles.editBtn} onPress={saveEdits} activeOpacity={0.9}>
            <Ionicons name="save-outline" size={18} color="#fff" />
            <Text style={styles.editBtnText}>Guardar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editBtnAlt} onPress={cancelEdit} activeOpacity={0.9}>
            <Ionicons name="close" size={18} color="#fff" />
            <Text style={styles.editBtnText}>Cancelar</Text>
          </TouchableOpacity>
        </View>

        {/* Lista draggable */}
        <View style={{ flex: 1, paddingHorizontal: 16, paddingBottom: 40 }}>
          <DragList
            data={editSongs}
            keyExtractor={keyExtractor}
            onReordered={async (fromIndex, toIndex) => {
              const oldPos = fromIndex + 1;  // 1-based
              const newPos = toIndex + 1;    // 1-based

              if (oldPos === newPos) return; // NOOP

              // Snapshot para rollback + ítem movido
              const before = editSongs;
              const movedItem = before[fromIndex];

              rlog("onReordered", {
                fromIndex,
                toIndex,
                oldPos,
                newPos,
                moved: movedItem
                  ? {
                      internalId: movedItem.internalId,
                      id: movedItem.id,
                      title: movedItem.title,
                    }
                  : null,
              });

              // Optimista: mover en memoria
              const optimistic = (() => {
                const draft = before.slice();
                const [moved] = draft.splice(fromIndex, 1);
                draft.splice(toIndex, 0, moved);
                return draft;
              })();

              rlog("optimistic", {
                first5_before: before.slice(0, 5).map(brief),
                first5_after: optimistic.slice(0, 5).map(brief),
              });

              setEditSongs(optimistic);

              // Persistir en backend (POSICIONES) y reconciliar con ORDEN CANÓNICO
              try {
                if (playlist?.id) {
                  rlog("persist:request", {
                    playlistId: playlist.id,
                    oldPosition: oldPos,
                    newPosition: newPos,
                  });

                  const res: any = await moveTrackInPlaylist(playlist.id, oldPos, newPos);
                  rlog("persist:ok", { gaps: res?.gaps, dups: res?.dups });

                  if (res?.order?.length) {
                    // Corrige huecos/duplicados según el backend
                    setEditSongs(prev => applyServerOrder(prev, res.order));
                    setPlaylist(prev => (prev ? { ...prev, songs: applyServerOrder(prev.songs, res.order) } : prev));
                  }
                }
              } catch (e: any) {
                rlog("persist:error", { msg: e?.message });
                // Rollback si falla
                setEditSongs(before);
                Alert.alert("No se pudo reordenar", e?.message || "Intentá de nuevo.");
              }
            }}
            renderItem={(info: DragListRenderItemInfo<any>) => {
              const { item, onDragStart, onDragEnd, isActive, index } = info;

              const handlePressIn = () => {
                rlog("pressIn", {
                  index,
                  pos1: index + 1,
                  internalId: item?.internalId,
                  id: item?.id,
                  title: item?.title,
                });
                onDragStart();
              };
              const handlePressOut = () => {
                rlog("pressOut", {
                  index,
                  pos1: index + 1,
                  internalId: item?.internalId,
                  id: item?.id,
                  title: item?.title,
                });
                onDragEnd();
              };

              return (
                <View
                  style={[
                    styles.row,
                    {
                      backgroundColor: isActive ? "#151515" : "transparent",
                      opacity: isActive ? 0.95 : 1,
                    },
                  ]}
                >
                  {/* Handle: presioná/arrastrá para mover */}
                  <TouchableOpacity
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    style={styles.dragHandle}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="reorder-three-outline" size={22} color="#888" />
                  </TouchableOpacity>

                  {/* Remove inline */}
                  <TouchableOpacity
                    onPress={() => handleInlineRemove(item.internalId)}
                    style={styles.removeBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="remove-circle" size={22} color="#ff6b6b" />
                  </TouchableOpacity>

                  {/* Thumb */}
                  <View style={styles.thumbBox}>
                    {item.albumCover ? (
                      <Image source={{ uri: item.albumCover }} style={styles.thumb} />
                    ) : (
                      <View style={[styles.thumb, { backgroundColor: "#333" }]} />
                    )}
                  </View>

                  {/* Textos */}
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.songTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.songArtist} numberOfLines={1}>
                      {item.artist}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        </View>
      </View>

      {/* Submenú superior (por si querés salir/eliminar desde edición) */}
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

          <TouchableOpacity onPress={cancelEdit} style={styles.menuRow} activeOpacity={0.85}>
            <Ionicons name="close" size={18} color="#ddd" />
            <Text style={styles.menuRowText}>Cerrar edición</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={closeMenu}
            style={[styles.menuRow, { borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }]}
            activeOpacity={0.85}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color="#ddd" />
            <Text style={styles.menuRowText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Sheet acciones (no se usa en edición, lo dejamos cerrado) */}
      <TrackActionsSheet open={false} onOpenChange={() => {}} track={null} playlistId={playlist.id} />
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

  // Edición
  editBar: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#222",
    backgroundColor: "#0f0f0f",
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  editBtnAlt: {
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
  editBtnText: { color: "#fff", fontWeight: "700" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#222",
  },
  index: { color: "#aaa", fontSize: 12 },

  dragHandle: { width: 28, alignItems: "center", marginRight: 6, justifyContent: "center" },
  removeBtn: { width: 28, alignItems: "center", marginRight: 6, justifyContent: "center" },

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
