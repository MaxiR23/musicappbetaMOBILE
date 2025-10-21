import { useMusicApi } from "@/src/hooks/use-music-api";
import React, { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { emitPlaylistChange } from '@/src/utils/playlist-events';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (playlist: any) => void;
};

export default function CreatePlaylistModal({ open, onOpenChange, onCreated }: Props) {
  const { createPlaylist } = useMusicApi();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isValid = useMemo(() => name.trim().length > 0, [name]);

  async function handleCreate() {
    if (!isValid || loading) return;
    setLoading(true);
    setErr(null);
    try {
      const created = await createPlaylist(name.trim(), description.trim() || undefined, isPublic);
      emitPlaylistChange();
      onCreated?.(created);
      setName("");
      setDescription("");
      setIsPublic(false);
      onOpenChange(false);
    } catch (e: any) {
      setErr(e?.message || "Error creando la playlist");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => onOpenChange(false)}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => onOpenChange(false)} />

        <View style={styles.sheet}>
          <Text style={styles.title}>Crear Playlist</Text>
          <Text style={styles.subtitle}>Organizá tu música favorita</Text>

          {/* Nombre */}
          <View style={{ marginTop: 14 }}>
            <Text style={styles.label}>Nombre *</Text>
            <TextInput
              placeholder="Mi playlist increíble"
              placeholderTextColor="#888"
              value={name}
              onChangeText={setName}
              style={styles.input}
            />
          </View>

          {/* Descripción */}
          <View style={{ marginTop: 12 }}>
            <Text style={styles.label}>Descripción</Text>
            <TextInput
              placeholder="Describe tu playlist…"
              placeholderTextColor="#888"
              value={description}
              onChangeText={setDescription}
              style={[styles.input, { height: 86, textAlignVertical: "top" }]}
              multiline
            />
          </View>

          {/* Pública / Privada */}
          <View style={styles.privacyRow}>
            <View>
              <Text style={styles.privacyTitle}>{isPublic ? "Pública" : "Privada"}</Text>
              <Text style={styles.privacyHint}>
                {isPublic ? "Otros pueden descubrirla" : "Solo vos podés verla"}
              </Text>
            </View>
            <Switch value={isPublic} onValueChange={setIsPublic} />
          </View>

          {!!err && <Text style={styles.error}>{err}</Text>}

          {/* Acciones */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.btnGhost} onPress={() => onOpenChange(false)}>
              <Text style={styles.btnGhostText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnPrimary, !isValid || loading ? { opacity: 0.6 } : null]}
              onPress={handleCreate}
              disabled={!isValid || loading}
            >
              <Text style={styles.btnPrimaryText}>{loading ? "Creando…" : "Crear"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", alignItems: "center" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: {
    width: "88%",
    backgroundColor: "#161616",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  title: { color: "#fff", fontSize: 18, fontWeight: "700" },
  subtitle: { color: "#bbb", fontSize: 12, marginTop: 2 },
  label: { color: "#ddd", fontSize: 12, marginBottom: 6 },
  input: {
    backgroundColor: "#1d1d1d",
    borderWidth: 1,
    borderColor: "#2e2e2e",
    color: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  privacyRow: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    backgroundColor: "rgba(255,255,255,0.06)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  privacyTitle: { color: "#fff", fontWeight: "600" },
  privacyHint: { color: "#aaa", fontSize: 12, marginTop: 2 },
  error: { color: "#ff6b6b", marginTop: 10, fontSize: 12 },
  actions: { flexDirection: "row", justifyContent: "flex-end", marginTop: 16 },
  btnGhost: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3a3a3a",
    marginRight: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  btnGhostText: { color: "#fff", fontWeight: "600" },
  btnPrimary: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#4facfe", // mismo acento que el banner
  },
  btnPrimaryText: { color: "#000", fontWeight: "700" },
});