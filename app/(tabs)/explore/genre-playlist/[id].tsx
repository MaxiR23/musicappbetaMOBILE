// components/playlist/PlaylistEditView.tsx
import { reorderLog } from "@/src/utils/reorder-logger";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import DragList, { DragListRenderItemInfo } from "react-native-draglist";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

interface PlaylistEditViewProps {
  playlist: {
    id: string;
    name: string;
    description?: string;
    isPublic: boolean;
    songCount: number;
    duration: string;
    songs: any[];
  };
  mosaicImages: string[];
  editSongs: any[];
  contentPadding?: { paddingBottom: number };
  onSave: () => void;
  onCancel: () => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRemove: (internalId: string | number) => void;
  onMenuPress: () => void;
}

export default function PlaylistEditView({
  playlist,
  mosaicImages,
  editSongs,
  contentPadding,
  onSave,
  onCancel,
  onReorder,
  onRemove,
  onMenuPress,
}: PlaylistEditViewProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [hasChanges, setHasChanges] = useState(false);
  const [initialSongsCount, setInitialSongsCount] = useState(editSongs.length);

  // Calcular altura exacta del top bar
  const topBarHeight = insets.top + 28;

  // Detectar cambios (reorden o eliminación)
  useEffect(() => {
    // Si cambió la cantidad de canciones -> hay cambios
    if (editSongs.length !== initialSongsCount) {
      setHasChanges(true);
    }
  }, [editSongs.length, initialSongsCount]);

  const handleReorder = React.useCallback((fromIndex: number, toIndex: number) => {
    setHasChanges(true);
    onReorder(fromIndex, toIndex);
  }, [onReorder]);

  const handleRemove = React.useCallback((internalId: string | number) => {
    setHasChanges(true);
    onRemove(internalId);
  }, [onRemove]);

  const handleSave = () => {
    if (!hasChanges) return;
    onSave();
    setHasChanges(false);
  };

  const handleCancel = () => {
    router.back();
  };

  const keyExtractor = (item: any, i: number) =>
    String(item?.internalId ?? item?.id ?? i);

  // Componente memoizado para evitar re-renders innecesarios
  const renderTrackRow = React.useCallback((info: DragListRenderItemInfo<any>) => {
    const { item, onDragStart, onDragEnd, isActive, index } = info;

    const handlePressIn = () => {
      reorderLog("pressIn", {
        index,
        pos1: index + 1,
        internalId: item?.internalId,
        id: item?.id,
        title: item?.title,
      });
      onDragStart();
    };

    const handlePressOut = () => {
      reorderLog("pressOut", {
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
            backgroundColor: isActive ? "#1a1a1a" : "transparent",
            opacity: isActive ? 0.95 : 1,
          },
        ]}
      >
        {/* Remove Button */}
        <Pressable
          onPress={() => handleRemove(item.internalId)}
          style={styles.removeBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="remove-circle" size={22} color="#ff6b6b" />
        </Pressable>

        {/* Thumbnail */}
        <View style={styles.thumbBox}>
          {item.albumCover ? (
            <Image source={{ uri: item.albumCover }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, { backgroundColor: "#2a2a2a" }]} />
          )}
        </View>

        {/* Track Info */}
        <View style={styles.trackInfo}>
          <Text style={styles.songTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.songArtist} numberOfLines={1}>
            {item.artist}
          </Text>
        </View>

        {/* Drag Handle */}
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.dragHandle}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="reorder-three-outline" size={24} color="#888" />
        </Pressable>
      </View>
    );
  }, [handleRemove]);

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      {/* Top Bar Simple */}
      <View style={styles.topBarContainer}>
        <BlurView intensity={80} style={StyleSheet.absoluteFillObject} tint="dark" />
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          <View style={styles.topBarContent}>
            {/* Back button */}
            <Pressable onPress={handleCancel} style={styles.topBarButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </Pressable>

            {/* Título */}
            <Text style={styles.topBarTitle} numberOfLines={1}>
              Editar Playlist
            </Text>

            {/* Check button (solo si hay cambios) */}
            {hasChanges ? (
              <Pressable onPress={handleSave} style={styles.topBarButton}>
                <Ionicons name="checkmark" size={28} color="#1ed760" />
              </Pressable>
            ) : (
              <View style={styles.topBarButton} />
            )}
          </View>
        </SafeAreaView>
      </View>

      {/* Draggable List */}
      <View style={[styles.listContainer, { paddingTop: topBarHeight }, contentPadding]}>
        <DragList
          data={editSongs}
          keyExtractor={keyExtractor}
          onReordered={handleReorder}
          renderItem={renderTrackRow}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0e0e0e",
  },

  // Top Bar
  topBarContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: "hidden",
  },
  topBarContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  topBarButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  topBarTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginHorizontal: 8,
  },

  // Lista
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },

  // Track Row
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#222",
  },
  removeBtn: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  thumbBox: {
    width: 48,
    height: 48,
    borderRadius: 6,
    overflow: "hidden",
  },
  thumb: {
    width: "100%",
    height: "100%",
  },
  trackInfo: {
    flex: 1,
    marginLeft: 12,
  },
  songTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  songArtist: {
    color: "#aaa",
    fontSize: 13,
    marginTop: 2,
  },
  dragHandle: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
});