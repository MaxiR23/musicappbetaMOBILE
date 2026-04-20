import React from "react";
import { useTranslation } from "react-i18next";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export interface ConfirmAction {
  label: string;
  onPress: () => void | Promise<void>;
  destructive?: boolean;
}

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  message?: string;
  actions: ConfirmAction[];
  cancelLabel?: string;
}

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  actions,
  cancelLabel,
}: ConfirmDialogProps) {
  const { t } = useTranslation("common");
  const resolvedCancelLabel = cancelLabel ?? t("actions.cancel");

  const handleActionPress = async (action: ConfirmAction) => {
    onOpenChange(false);
    await Promise.resolve(action.onPress());
  };

  if (!open) return null;

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => onOpenChange(false)}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => onOpenChange(false)}
        />

        <View style={styles.dialog}>
          <Text style={styles.title} numberOfLines={4}>
            {title}
          </Text>

          {!!message && (
            <Text style={styles.message} numberOfLines={6}>
              {message}
            </Text>
          )}

          <View style={styles.actions}>
            {actions.map((action, idx) => (
              <TouchableOpacity
                key={`${action.label}-${idx}`}
                style={styles.actionButton}
                onPress={() => handleActionPress(action)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.actionLabel,
                    action.destructive && styles.actionLabelDestructive,
                  ]}
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => onOpenChange(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelLabel}>{resolvedCancelLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 28,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  dialog: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#161616",
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: "#222",
  },
  title: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 20,
  },
  message: {
    color: "#bbb",
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  actions: {
    marginTop: 14,
    gap: 4,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "center",
    borderRadius: 8,
  },
  actionLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  actionLabelDestructive: {
    color: "#ff6b6b",
  },
  cancelButton: {
    marginTop: 2,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelLabel: {
    color: "#888",
    fontSize: 14,
    fontWeight: "600",
  },
});