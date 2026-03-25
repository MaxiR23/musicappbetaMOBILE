// components/playlist/PlaylistOptionsSheet.tsx
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface PlaylistOptionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
  onEdit?: () => void;
  onEditDetails?: () => void;
  editMode?: boolean;
}

export default function PlaylistOptionsSheet({
  open,
  onOpenChange,
  onDelete,
  onEdit,
  onEditDetails,
  editMode = false,
}: PlaylistOptionsSheetProps) {
  const { t } = useTranslation("playlist");

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => onOpenChange(false)}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => onOpenChange(false)}
        />

        <View style={styles.sheet}>
          <View style={styles.grabber} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ width: 22 }} />
            <Text style={styles.headerTitle}>{t("options.title")}</Text>
            <TouchableOpacity
              onPress={() => onOpenChange(false)}
              style={styles.iconBtn}
            >
              <Ionicons name="close" size={18} color="#aaa" />
            </TouchableOpacity>
          </View>

          {/* Acciones */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
            {/* Eliminar */}
            <ActionRow
              icon="trash-outline"
              label={t("delete.title")}
              onPress={onDelete}
              danger
            />

            {/* Editar detalles */}
            {!editMode && onEditDetails && (
              <ActionRow
                icon="pencil-outline"
                label={t("options.editDetails")}
                onPress={onEditDetails}
              />
            )}

            {/* Editar / Cerrar edición */}
            {editMode ? (
              <ActionRow
                icon="close"
                label={t("options.closeEdit")}
                onPress={() => onOpenChange(false)}
              />
            ) : (
              onEdit && (
                <ActionRow
                  icon="create-outline"
                  label={t("options.edit")}
                  onPress={onEdit}
                />
              )
            )}
          </View>
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
      <Text style={[styles.rowText, danger ? { color: "#ff6b6b" } : null]}>
        {label}
      </Text>
      <Ionicons
        name="chevron-forward"
        size={18}
        color="#666"
        style={{ marginLeft: "auto" }}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: "#111",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 8,
    paddingBottom: 12,
  },
  grabber: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#333",
    marginBottom: 8,
  },
  headerRow: {
    paddingHorizontal: 12,
    paddingBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  iconBtn: {
    padding: 6,
  },
  row: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowText: {
    color: "#fff",
    fontSize: 14,
  },
});