// components/playlist/PlaylistEditView.tsx
import { reorderLog } from "@/src/utils/reorder-logger";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import DragList, { DragListRenderItemInfo } from "react-native-draglist";
import PlaylistHeader from "./PlaylistHeader";

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

  const keyExtractor = (item: any, i: number) =>
    String(item?.internalId ?? item?.id ?? i);

  return (
    <View style={styles.container}>
      {/* Hero Header */}
      <View style={{ height: 320 }}>
        <PlaylistHeader
          variant="default"
          playlist={{ ...playlist, songCount: editSongs.length }}
          mosaicImages={mosaicImages}
          onMenuPress={onMenuPress}
          showBackButton={false}
        />
      </View>

      {/* Back button (custom para modo edición) */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Edit Bar */}
      <View style={styles.editBar}>
        <TouchableOpacity style={styles.editBtn} onPress={onSave} activeOpacity={0.9}>
          <Ionicons name="save-outline" size={18} color="#fff" />
          <Text style={styles.editBtnText}>Guardar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.editBtnAlt} onPress={onCancel} activeOpacity={0.9}>
          <Ionicons name="close" size={18} color="#fff" />
          <Text style={styles.editBtnText}>Cancelar</Text>
        </TouchableOpacity>
      </View>

      {/* Draggable List */}
      <View style={[
        { flex: 1, paddingHorizontal: 16 },
        contentPadding
      ]}>
        <DragList
          data={editSongs}
          keyExtractor={keyExtractor}
          onReordered={onReorder}
          renderItem={(info: DragListRenderItemInfo<any>) => {
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
                    backgroundColor: isActive ? "#151515" : "transparent",
                    opacity: isActive ? 0.95 : 1,
                  },
                ]}
              >
                {/* Remove Button (izquierda) */}
                <TouchableOpacity
                  onPress={() => onRemove(item.internalId)}
                  style={styles.removeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="remove-circle" size={20} color="#ff6b6b" />
                </TouchableOpacity>

                {/* Thumbnail */}
                <View style={styles.thumbBox}>
                  {item.albumCover ? (
                    <Image source={{ uri: item.albumCover }} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumb, { backgroundColor: "#333" }]} />
                  )}
                </View>

                {/* Track Info */}
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.songTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.songArtist} numberOfLines={1}>
                    {item.artist}
                  </Text>
                </View>

                {/* Drag Handle (derecha) */}
                <TouchableOpacity
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  style={styles.dragHandle}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="reorder-three-outline" size={22} color="#888" />
                </TouchableOpacity>
              </View>
            );
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0e0e0e",
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 16,
    backgroundColor: "#0008",
    padding: 10,
    borderRadius: 20,
  },
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
  editBtnText: {
    color: "#fff",
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#222",
  },
  dragHandle: {
    width: 28,
    alignItems: "center",
    marginRight: 6,
    justifyContent: "center",
  },
  removeBtn: {
    width: 28,
    alignItems: "center",
    marginRight: 6,
    justifyContent: "center",
  },
  thumbBox: {
    width: 40,
    height: 40,
    borderRadius: 6,
    overflow: "hidden",
  },
  thumb: {
    width: "100%",
    height: "100%",
  },
  songTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  songArtist: {
    color: "#bbb",
    fontSize: 12,
    marginTop: 2,
  },
});