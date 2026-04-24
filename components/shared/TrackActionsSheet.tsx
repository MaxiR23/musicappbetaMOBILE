import { useLibraryView } from "@/hooks/use-library-view";
import { useMusicApi } from "@/hooks/use-music-api";
import { Ionicons } from "@expo/vector-icons";
import { router, useSegments } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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

import { canOffline } from "@/config/feature-flags";
import { useOffline } from "@/hooks/use-offline";
import { supabase } from "@/lib/supabase";

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

    playlistId?: string;
    onRemove?: (playlistId: string, trackId: string) => Promise<void> | void;

    extraActions?: ExtraAction[];

    headerTitle?: string;
    subtitle?: string;
    showAddTo?: boolean;
    showRemove?: boolean;
    showShare?: boolean;
    showGoToArtist?: boolean;
    showGoToAlbum?: boolean;

    onGoToArtist?: (artistId: string) => void;
    onGoToAlbum?: (albumId: string) => void;
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
    showGoToArtist,
    showGoToAlbum,
    onGoToArtist,
    onGoToAlbum,
}: Props) {
    const { t } = useTranslation("common");
    const segments = useSegments();
    const currentTab = (segments[1] as string) || "home";
    const { addTrackToPlaylist, createPlaylist } = useMusicApi();
    const { ownedPlaylists } = useLibraryView();

    const [mode, setMode] = useState<Mode>("root");
    const [loading, setLoading] = useState(false);

    const [err, setErr] = useState<string | null>(null);

    const [name, setName] = useState("");
    const [desc, setDesc] = useState("");
    const canCreate = useMemo(() => name.trim().length > 0, [name]);

    const [addingToId, setAddingToId] = useState<string | null>(null);
    const [addedToId, setAddedToId] = useState<string | null>(null);
    const [alreadyInId, setAlreadyInId] = useState<string | null>(null);

    const { download, remove, downloading, progress, isDownloaded } = useOffline();
    const [isTrackOffline, setIsTrackOffline] = useState(false);
    const [offlineAllowed, setOfflineAllowed] = useState(false);

    useEffect(() => {
        if (!open) {
            setMode("root");
            setErr(null);
            setName("");
            setDesc("");
            setLoading(false);
            setAddingToId(null);
            setAddedToId(null);
            setAlreadyInId(null);
        }
    }, [open, track]);

    // TODO: TEST offline {
    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            const uid = data.session?.user?.id;
            // DBG: {
            //console.log("[offline] uid:", uid);
            //console.log("[offline] canOffline:", uid ? canOffline(uid) : "no uid");
            // DBG }
            if (uid) setOfflineAllowed(canOffline(uid));
        });
    }, []);

    useEffect(() => {
        if (!open || !track?.id || !offlineAllowed) return;
        isDownloaded(track.id).then(setIsTrackOffline);
    }, [open, track, offlineAllowed]);
    // TODO: TEST offline }

    // ── NAVIGATION ────────────────────────────────────────────────────────────
    const artistId = track?.artist_id ?? null;
    const albumId = track?.album_id ?? track?.go_to?.album_id ?? null;

    const allowGoToArtist = showGoToArtist !== false && !!artistId;
    const allowGoToAlbum = showGoToAlbum !== false && !!albumId;

    function handleGoToArtist() {
        if (!artistId) return;
        onOpenChange(false);
        if (onGoToArtist) {
            onGoToArtist(artistId);
        } else {
            router.push(`/(tabs)/${currentTab}/artist/${artistId}` as any);
        }
    }

    function handleGoToAlbum() {
        if (!albumId) return;
        onOpenChange(false);
        if (onGoToAlbum) {
            onGoToAlbum(albumId);
        } else {
            router.push(`/(tabs)/${currentTab}/album/${albumId}` as any);
        }
    }

    // ── ACTIONS ───────────────────────────────────────────────────────────────

    async function handleShare() {
        if (!track) return;
        try {
            await Share.share({
                message: `${track.title} • ${track.artist_name ?? track.artist ?? ""}`,
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
            setErr(e?.message || t("trackActions.removeFailed"));
        } finally {
            setLoading(false);
        }
    }

    async function handleAddTo(plId: string) {
        if (!track) return;
        setAddingToId(plId);
        setErr(null);
        setAlreadyInId(null);

        try {
            await addTrackToPlaylist(plId, track);
            setAddingToId(null);
            setAddedToId(plId);
            onOpenChange(false);
        } catch (e: any) {
            setAddingToId(null);
            if (e?.message?.includes("409") || e?.message?.includes("already_in_playlist")) {
                setAlreadyInId(plId);
            } else {
                setErr(e?.message || t("trackActions.addFailed"));
            }
        }
    }

    async function handleCreateAndAdd() {
        if (!track || !canCreate) return;
        setLoading(true);
        setErr(null);
        try {
            const pl = await createPlaylist(name.trim(), desc.trim() || undefined, false);
            await addTrackToPlaylist(pl.id, track);
            onOpenChange(false);
        } catch (e: any) {
            setErr(e?.message || t("trackActions.createFailed"));
        } finally {
            setLoading(false);
        }
    }

    const allowAdd = showAddTo !== false && !!track;
    const allowRemove = showRemove !== false && !!playlistId && !!onRemove && !!track;
    const allowShare = showShare !== false && !!track;

    const resolvedHeaderTitle = headerTitle ?? (
        mode === "root"
            ? t("trackActions.title")
            : mode === "add"
                ? t("trackActions.addToPlaylist")
                : t("trackActions.newPlaylist")
    );

    if (!open) return null;

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
                            {resolvedHeaderTitle}
                        </Text>
                        <TouchableOpacity onPress={() => onOpenChange(false)} style={styles.iconBtn}>
                            <Ionicons name="close" size={18} color="#aaa" />
                        </TouchableOpacity>
                    </View>

                    {/* LINEA SUBTÍTULO */}
                    {!!(track?.title || subtitle) && (
                        <Text style={styles.trackLine} numberOfLines={1}>
                            {track?.title
                                ? `${track.title} • ${track.artist_name || track.artist || ""}`
                                : subtitle || ""}
                        </Text>
                    )}

                    {/* BODY */}
                    {mode === "root" && (
                        <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
                            {allowAdd && (
                                <ActionRow
                                    icon="add-circle-outline"
                                    label={t("trackActions.addToPlaylist")}
                                    onPress={() => setMode("add")}
                                />
                            )}
                            {allowGoToArtist && (
                                <ActionRow
                                    icon="person-outline"
                                    label={t("trackActions.goToArtist")}
                                    onPress={handleGoToArtist}
                                />
                            )}
                            {allowGoToAlbum && (
                                <ActionRow
                                    icon="disc-outline"
                                    label={t("trackActions.goToAlbum")}
                                    onPress={handleGoToAlbum}
                                />
                            )}
                            {allowRemove && (
                                <ActionRow
                                    icon="remove-circle-outline"
                                    label={t("trackActions.removeFromPlaylist")}
                                    onPress={handleRemove}
                                    danger
                                />
                            )}
                            {allowShare && (
                                <ActionRow icon="share-outline" label={t("trackActions.share")} onPress={handleShare} />
                            )}

                            {/* TODO: TEST offline { */}
                            {offlineAllowed && !!track?.id && (
                                <ActionRow
                                    icon={isTrackOffline ? "trash-outline" : "cloud-download-outline"}
                                    label={
                                        downloading === track.id
                                            ? `${t("trackActions.downloading")} ${Math.round(progress * 100)}%`
                                            : isTrackOffline
                                                ? t("trackActions.removeDownload")
                                                : t("trackActions.download")
                                    }
                                    onPress={async () => {
                                        if (downloading) return;
                                        try {
                                            if (isTrackOffline) {
                                                await remove(track.id);
                                                setIsTrackOffline(false);
                                            } else {
                                                await download({
                                                    track_id: track.id,
                                                    title: track.title,
                                                    artists: Array.isArray(track.artists) ? track.artists : [],
                                                    album: track.album_name ?? track.album ?? "",
                                                    album_id: track.album_id ?? "",
                                                    thumbnail_url: track.thumbnail ?? track.thumbnail_url ?? "",
                                                    duration_seconds: track.duration_seconds ?? 0,
                                                });
                                                setIsTrackOffline(true);
                                            }
                                        } catch (e: any) {
                                            console.log("[offline] error:", e?.message);
                                            setErr(e?.message || t("trackActions.downloadFailed"));
                                        }
                                    }}
                                    danger={isTrackOffline}
                                />
                            )}
                            {/* TODO: TEST offline } */}

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
                            {ownedPlaylists.map((pl) => {
                                const isAlready = alreadyInId === pl.id;
                                return (
                                    <TouchableOpacity
                                        key={pl.id}
                                        style={styles.listRow}
                                        activeOpacity={0.85}
                                        onPress={() => handleAddTo(pl.id)}
                                        disabled={addingToId === pl.id || addedToId === pl.id}
                                    >
                                        <Ionicons name="musical-notes" size={16} color="#bbb" style={{ marginRight: 10 }} />
                                        <Text style={styles.listRowText} numberOfLines={1}>{pl.title}</Text>

                                        {addingToId === pl.id && (
                                            <ActivityIndicator size="small" color="#bbb" style={{ marginLeft: "auto" }} />
                                        )}
                                        {addedToId === pl.id && (
                                            <Ionicons name="checkmark-circle" size={20} color="#4ade80" style={{ marginLeft: "auto" }} />
                                        )}
                                        {isAlready && (
                                            <Text style={styles.alreadyIn}>{t("trackActions.alreadyInPlaylist")}</Text>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                            <TouchableOpacity
                                style={[styles.listRow, { marginTop: 8 }]}
                                onPress={() => setMode("create")}
                                activeOpacity={0.85}
                            >
                                <Ionicons name="add" size={18} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={[styles.listRowText, { color: "#fff" }]}>{t("trackActions.newPlaylist")}</Text>
                            </TouchableOpacity>

                            {err && <Text style={styles.error}>{err}</Text>}
                            {loading && <ActivityIndicator style={{ marginTop: 10 }} color="#bbb" />}
                        </ScrollView>
                    )}

                    {mode === "create" && (
                        <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
                            <Text style={styles.label}>{t("trackActions.nameLabel")}</Text>
                            <TextInput
                                value={name}
                                onChangeText={setName}
                                placeholder={t("trackActions.namePlaceholder")}
                                placeholderTextColor="#888"
                                style={styles.input}
                            />
                            <Text style={[styles.label, { marginTop: 8 }]}>{t("trackActions.descriptionLabel")}</Text>
                            <TextInput
                                value={desc}
                                onChangeText={setDesc}
                                placeholder={t("trackActions.descriptionPlaceholder")}
                                placeholderTextColor="#888"
                                style={[styles.input, { height: 70, textAlignVertical: "top" }]}
                                multiline
                            />
                            {err && <Text style={styles.error}>{err}</Text>}
                            <View style={styles.footerActions}>
                                <TouchableOpacity style={styles.btnGhost} onPress={() => setMode("add")}>
                                    <Text style={styles.btnGhostText}>{t("actions.cancel")}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.btnPrimary, !canCreate || loading ? { opacity: 0.6 } : null]}
                                    disabled={!canCreate || loading}
                                    onPress={handleCreateAndAdd}
                                    activeOpacity={0.85}
                                >
                                    <Ionicons name="checkmark" size={16} color="#000" />
                                    <Text style={styles.btnPrimaryText}>{t("trackActions.createAndAdd")}</Text>
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

    alreadyIn: { color: "#f59e0b", fontSize: 12, marginLeft: "auto" },

    label: { color: "#ddd", fontSize: 12, marginBottom: 6 },
    input: { backgroundColor: "#1a1a1a", borderColor: "#333", borderWidth: 1, color: "#fff", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
    error: { color: "#ff8585", marginTop: 8 },

    footerActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 12 },
    btnGhost: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: "#333" },
    btnGhostText: { color: "#fff", fontWeight: "600" },
    btnPrimary: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: "#fff" },
    btnPrimaryText: { color: "#000", fontWeight: "800" },
});