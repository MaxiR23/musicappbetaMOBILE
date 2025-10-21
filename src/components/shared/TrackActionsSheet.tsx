// src/components/TrackActionsSheet.tsx
import { useMusicApi } from "@/src/hooks/use-music-api";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

type Track = any;

type ExtraAction = {
    key: string;
    label: string;
    icon?: keyof typeof Ionicons.glyphMap;
    onPress: () => void | Promise<void>;
};

type Props = {
    open: boolean;
    onOpenChange: (o: boolean) => void;
    track: Track | null;

    // uso “track” (por-canción)
    playlistId?: string;
    onRemove?: (playlistId: string, trackId: string) => Promise<void> | void;

    // acciones extra
    extraActions?: ExtraAction[];

    // 🆕 modo genérico (para avatar / menú de usuario / etc.)
    headerTitle?: string;       // override del título ("Opciones")
    subtitle?: string;          // línea secundaria cuando no hay track (p.ej. nombre • mail)
    showAddTo?: boolean;        // default: true
    showRemove?: boolean;       // default: true (si hay playlistId+onRemove)
    showShare?: boolean;        // default: true
};

type Mode = "root" | "add" | "create";

export default function TrackActionsSheet({
    open,
    onOpenChange,
    track,
    playlistId,
    onRemove,
    extraActions = [],
    headerTitle,
    subtitle,
    showAddTo,
    showRemove,
    showShare,
}: Props) {
    const { getPlaylists, addTrackToPlaylist, createPlaylist, getPlaylistById } = useMusicApi();

    const [mode, setMode] = useState<Mode>("root");
    const [loading, setLoading] = useState(false);

    const [playlists, setPlaylists] = useState<any[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const [name, setName] = useState("");
    const [desc, setDesc] = useState("");
    const canCreate = useMemo(() => name.trim().length > 0, [name]);

    const [addingToId, setAddingToId] = useState<string | null>(null);
    const [addedToId, setAddedToId] = useState<string | null>(null);

    useEffect(() => {
        if (!open) {
            setMode("root");
            setErr(null);
            setName("");
            setDesc("");
            setLoading(false);
            setLoaded(false);
            setAddingToId(null);
            setAddedToId(null);
        }
    }, [open, track]);

    useEffect(() => {
        if (!open || mode !== "add" || loaded) return;
        getPlaylists()
            .then((pls) => {
                setPlaylists(pls || []);
                setLoaded(true);
            })
            .catch((e) => console.error("[Sheet] getPlaylists error:", e));
    }, [open, mode, loaded, getPlaylists]);

    async function handleShare() {
        if (!track) return;
        try {
            await Share.share({
                message: `${track.title} • ${track.artistName ?? track.artist ?? ""}`,
            });
        } catch (e) { }
    }

    async function handleRemove() {
        if (!track || !playlistId || !onRemove) return;
        setLoading(true);
        setErr(null);
        const removeKey = (track as any)?.internalId ?? track.id;
        try {
            await onRemove(playlistId, String(removeKey));
            onOpenChange(false);
        } catch (e: any) {
            setErr(e?.message || "No se pudo quitar el tema.");
        } finally {
            setLoading(false);
        }
    }

    async function verifyAdded(plId: string, candidateIds: string[]) {
        try {
            const after = await getPlaylistById(plId);
            const items = after?.tracks || after?.playlist_tracks || [];
            const found = items.some((t: any) => {
                const keys = [t.id, t.track_id, t.video_id, t.song_id, t?.tracks?.id, t?.tracks?.track_id];
                return keys.some((k) => k && candidateIds.includes(String(k)));
            });
            if (!found) console.warn("[Sheet] NOT FOUND after add (id/track_id mismatch?).");
        } catch { }
    }

    async function handleAddTo(plId: string) {
        if (!track) return;
        setAddingToId(plId); // Marcar que está procesando
        setErr(null);
        try {
            await addTrackToPlaylist(plId, track);
            await verifyAdded(plId, [String(track.id)]);

            // Mostrar check
            setAddingToId(null);
            setAddedToId(plId);

            // Cerrar después de 1 segundo
            setTimeout(() => {
                setAddedToId(null);
                onOpenChange(false);
            }, 1000);
        } catch (e: any) {
            setErr(e?.message || "No se pudo agregar el tema.");
            setAddingToId(null);
        }
    }

    async function handleCreateAndAdd() {
        if (!track || !canCreate) return;
        setLoading(true);
        setErr(null);
        try {
            const pl = await createPlaylist(name.trim(), desc.trim() || undefined, false);
            await addTrackToPlaylist(pl.id, track);
            await verifyAdded(pl.id, [String(track.id)]);
            onOpenChange(false);
        } catch (e: any) {
            setErr(e?.message || "No se pudo crear/agregar.");
        } finally {
            setLoading(false);
        }
    }

    // 🆕 flags (por defecto como hoy: todo visible)
    const allowAdd = showAddTo !== false && !!track;
    const allowRemove = showRemove !== false && !!playlistId && !!onRemove && !!track;
    const allowShare = showShare !== false && !!track;

    return (
        <Modal visible={open} transparent animationType="fade" onRequestClose={() => onOpenChange(false)}>
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => onOpenChange(false)} />

                <View style={styles.sheet}>
                    <View style={styles.grabber} />

                    {/* HEADER */}
                    <View style={styles.headerRow}>
                        {mode !== "root" ? (
                            <TouchableOpacity onPress={() => setMode("root")} style={styles.iconBtn}>
                                <Ionicons name="chevron-back" size={22} color="#ddd" />
                            </TouchableOpacity>
                        ) : (
                            <View style={{ width: 22 }} />
                        )}
                        <Text style={styles.headerTitle}>
                            {headerTitle ?? (mode === "root" ? "Opciones" : mode === "add" ? "Agregar a playlist" : "Nueva playlist")}
                        </Text>
                        <TouchableOpacity onPress={() => onOpenChange(false)} style={styles.iconBtn}>
                            <Ionicons name="close" size={18} color="#aaa" />
                        </TouchableOpacity>
                    </View>

                    {/* LINEA SUBTÍTULO */}
                    {!!(track?.title || subtitle) && (
                        <Text style={styles.trackLine} numberOfLines={1}>
                            {track?.title
                                ? `${track.title} • ${track.artistName || track.artist || ""}`
                                : subtitle || ""}
                        </Text>
                    )}

                    {/* BODY */}
                    {mode === "root" && (
                        <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
                            {allowAdd && (
                                <ActionRow
                                    icon="add-circle-outline"
                                    label="Agregar a playlist"
                                    onPress={() => setMode("add")}
                                />
                            )}
                            {allowRemove && (
                                <ActionRow
                                    icon="remove-circle-outline"
                                    label="Quitar de esta playlist"
                                    onPress={handleRemove}
                                    danger
                                />
                            )}
                            {allowShare && (
                                <ActionRow icon="share-outline" label="Compartir" onPress={handleShare} />
                            )}
                            {extraActions.map((a) => (
                                <ActionRow
                                    key={a.key}
                                    icon={(a.icon as any) || "ellipsis-horizontal"}
                                    label={a.label}
                                    onPress={a.onPress}
                                />
                            ))}
                            {err && <Text style={styles.error}>{err}</Text>}
                        </View>
                    )}

                    {mode === "add" && (
                        <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                            {playlists.map((pl) => (
                                <TouchableOpacity
                                    key={pl.id}
                                    style={styles.listRow}
                                    activeOpacity={0.85}
                                    onPress={() => handleAddTo(pl.id)}
                                    disabled={addingToId === pl.id || addedToId === pl.id} // Deshabilitar mientras procesa
                                >
                                    <Ionicons name="musical-notes" size={16} color="#bbb" style={{ marginRight: 10 }} />
                                    <Text style={styles.listRowText} numberOfLines={1}>{pl.title}</Text>

                                    {/* Spinner o Check */}
                                    {addingToId === pl.id && (
                                        <ActivityIndicator size="small" color="#bbb" style={{ marginLeft: "auto" }} />
                                    )}
                                    {addedToId === pl.id && (
                                        <Ionicons name="checkmark-circle" size={20} color="#4ade80" style={{ marginLeft: "auto" }} />
                                    )}
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity
                                style={[styles.listRow, { marginTop: 8 }]}
                                onPress={() => setMode("create")}
                                activeOpacity={0.85}
                            >
                                <Ionicons name="add" size={18} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={[styles.listRowText, { color: "#fff" }]}>Nueva playlist</Text>
                            </TouchableOpacity>

                            {err && <Text style={styles.error}>{err}</Text>}
                            {loading && <ActivityIndicator style={{ marginTop: 10 }} color="#bbb" />}
                        </ScrollView>
                    )}

                    {mode === "create" && (
                        <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
                            <Text style={styles.label}>Nombre *</Text>
                            <TextInput
                                value={name}
                                onChangeText={setName}
                                placeholder="Mi playlist"
                                placeholderTextColor="#888"
                                style={styles.input}
                            />
                            <Text style={[styles.label, { marginTop: 8 }]}>Descripción</Text>
                            <TextInput
                                value={desc}
                                onChangeText={setDesc}
                                placeholder="Opcional…"
                                placeholderTextColor="#888"
                                style={[styles.input, { height: 70, textAlignVertical: "top" }]}
                                multiline
                            />
                            {err && <Text style={styles.error}>{err}</Text>}
                            <View style={styles.footerActions}>
                                <TouchableOpacity style={styles.btnGhost} onPress={() => setMode("add")}>
                                    <Text style={styles.btnGhostText}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.btnPrimary, !canCreate || loading ? { opacity: 0.6 } : null]}
                                    disabled={!canCreate || loading}
                                    onPress={handleCreateAndAdd}
                                    activeOpacity={0.85}
                                >
                                    <Ionicons name="checkmark" size={16} color="#000" />
                                    <Text style={styles.btnPrimaryText}>Crear y agregar</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

function ActionRow({
    icon,
    label,
    onPress,
    danger,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    danger?: boolean;
}) {
    return (
        <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.85}>
            <Ionicons name={icon} size={18} color={danger ? "#ff6b6b" : "#fff"} />
            <Text style={[styles.rowText, danger ? { color: "#ff6b6b" } : null]}>{label}</Text>
            <Ionicons name="chevron-forward" size={18} color="#666" style={{ marginLeft: "auto" }} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
    backdrop: { ...StyleSheet.absoluteFillObject },
    sheet: { backgroundColor: "#111", borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingTop: 8, paddingBottom: 12 },
    grabber: { alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: "#333", marginBottom: 8 },
    headerRow: { paddingHorizontal: 12, paddingBottom: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    headerTitle: { color: "#fff", fontWeight: "700", fontSize: 15 },
    iconBtn: { padding: 6 },
    trackLine: { color: "#bbb", fontSize: 12, paddingHorizontal: 16, paddingBottom: 8 },

    row: { height: 44, flexDirection: "row", alignItems: "center", gap: 10 },
    rowText: { color: "#fff", fontSize: 14 },

    listRow: { height: 42, flexDirection: "row", alignItems: "center" },
    listRowText: { color: "#ddd", fontSize: 14, marginLeft: 10 },

    label: { color: "#ddd", fontSize: 12, marginBottom: 6 },
    input: { backgroundColor: "#1a1a1a", borderColor: "#333", borderWidth: 1, color: "#fff", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
    error: { color: "#ff8585", marginTop: 8 },

    footerActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 12 },
    btnGhost: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: "#333" },
    btnGhostText: { color: "#fff", fontWeight: "600" },
    btnPrimary: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: "#fff" },
    btnPrimaryText: { color: "#000", fontWeight: "800" },
});