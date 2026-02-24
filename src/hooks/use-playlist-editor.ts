import { useMusicApi } from "@/src/hooks/use-music-api";
import { formatDuration, parseDurationToMs } from "@/src/utils/durations";
import { applyServerOrder, briefSong, reorderLog } from "@/src/utils/reorder-logger";
import { useEffect, useState } from "react";
import { Alert } from "react-native";

export function usePlaylistEditor(playlist: any) {
  const { removeTrackFromPlaylist, moveTrackInPlaylist } = useMusicApi();

  const [editMode, setEditMode] = useState(false);
  const [editSongs, setEditSongs] = useState<any[]>([]);

  // Inicia modo edición
  const startEdit = () => {
    if (!playlist) return;
    setEditSongs(playlist.songs.map((s: any) => ({ ...s })));
    setEditMode(true);
    reorderLog("start", {
      count: playlist.songs.length,
      first5: playlist.songs.slice(0, 5).map(briefSong),
    });
  };

  // Cancela edición
  const cancelEdit = () => {
    setEditMode(false);
    setEditSongs([]);
    reorderLog("cancel");
  };

  // Guarda cambios
  const saveEdits = () => {
    if (!playlist) {
      setEditMode(false);
      return;
    }
    setEditMode(false);
    reorderLog("save", {
      count: editSongs.length,
      first5: editSongs.slice(0, 5).map(briefSong),
    });
    return editSongs;
  };

  // Elimina track inline (optimista)
  const handleInlineRemove = async (internalId: string | number) => {
    if (!playlist) return null;

    try {
      await removeTrackFromPlaylist(playlist.id, String(internalId));

      // Actualiza snapshot de edición
      const nextSongs = editSongs.filter(
        (s: any) => String(s.internalId) !== String(internalId)
      );
      setEditSongs(nextSongs);

      reorderLog("remove", { internalId: String(internalId) });

      // Retorna nueva data para actualizar playlist principal
      const nextTotalMs = nextSongs.reduce(
        (acc: number, s: any) => acc + parseDurationToMs(s.duration),
        0
      );

      return {
        songs: nextSongs,
        songCount: nextSongs.length,
        duration: formatDuration(nextTotalMs),
      };
    } catch (e: any) {
      Alert.alert("Error", e?.message || "No se pudo quitar el tema.");
      reorderLog("remove:error", { msg: e?.message });
      return null;
    }
  };

  // Reordena tracks (drag & drop)
  const handleReorder = async (fromIndex: number, toIndex: number) => {
    const oldPos = fromIndex + 1;
    const newPos = toIndex + 1;

    if (oldPos === newPos) return null;

    const before = editSongs;
    const movedItem = before[fromIndex];

    reorderLog("onReordered", {
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

    reorderLog("optimistic", {
      first5_before: before.slice(0, 5).map(briefSong),
      first5_after: optimistic.slice(0, 5).map(briefSong),
    });

    setEditSongs(optimistic);

    // Persistir en backend
    try {
      if (playlist?.id) {
        reorderLog("persist:request", {
          playlistId: playlist.id,
          oldPosition: oldPos,
          newPosition: newPos,
        });

        const res: any = await moveTrackInPlaylist(playlist.id, oldPos, newPos);
        //DBG: console.log('[reorder] res.order:', JSON.stringify(res?.order?.slice(0, 3)));
        //DBG: console.log('[reorder] editSongs IDs:', editSongs.slice(0, 3).map(s => ({ internalId: s.internalId, id: s.id })));

        reorderLog("persist:ok", { gaps: res?.gaps, dups: res?.dups });

        if (res?.order?.length) {
          const corrected = applyServerOrder(optimistic, res.order);
          setEditSongs(corrected);
          return { songs: corrected, order: res.order };
        }
      }
      return { songs: optimistic };
    } catch (e: any) {
      reorderLog("persist:error", { msg: e?.message });
      // Rollback si falla
      setEditSongs(before);
      Alert.alert("No se pudo reordenar", e?.message || "Intentá de nuevo.");
      return null;
    }
  };

  // Logs al cambiar snapshot
  useEffect(() => {
    if (!editMode) return;
    reorderLog("set", {
      len: editSongs.length,
      first20: editSongs.slice(0, 20).map(briefSong),
    });
  }, [editSongs, editMode]);

  return {
    editMode,
    editSongs,
    startEdit,
    cancelEdit,
    saveEdits,
    handleInlineRemove,
    handleReorder,
  };
}