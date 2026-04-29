import { useProfile } from "@/hooks/use-profile";
import { useUserProfile } from "@/hooks/use-user-profile";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ROLE_BADGE_COLORS: Record<string, string> = {
  admin: "#ef4444",
  developer: "#3b82f6",
  tester: "#10b981",
};

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation("profile");
  const { profile, loading, error, updateProfile } = useProfile();
  const { userEmail, initials, gradient } = useUserProfile();

  const [editing, setEditing] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const startEditing = () => {
    if (!profile) return;
    setDisplayNameInput(profile.display_name ?? "");
    setUsernameInput(profile.username ?? "");
    setValidationError(null);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setValidationError(null);
  };

  const handleSave = async () => {
    if (!profile) return;

    const trimmedDisplay = displayNameInput.trim();
    const trimmedUsername = usernameInput.trim();

    if (trimmedDisplay && (trimmedDisplay.length < 1 || trimmedDisplay.length > 50)) {
      setValidationError(t("validation.displayNameLength"));
      return;
    }
    if (trimmedUsername) {
      if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
        setValidationError(t("validation.usernameLength"));
        return;
      }
      if (!USERNAME_REGEX.test(trimmedUsername)) {
        setValidationError(t("validation.usernameFormat"));
        return;
      }
    }

    const payload: { display_name?: string; username?: string } = {};
    if (trimmedDisplay !== (profile.display_name ?? "")) {
      payload.display_name = trimmedDisplay || undefined;
    }
    if (trimmedUsername !== (profile.username ?? "")) {
      payload.username = trimmedUsername || undefined;
    }

    if (Object.keys(payload).length === 0) {
      setEditing(false);
      return;
    }

    setSaving(true);
    setValidationError(null);
    try {
      await updateProfile(payload);
      setEditing(false);
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (msg.includes("23505") || msg.toLowerCase().includes("duplicate")) {
        Alert.alert(t("error.title"), t("error.usernameTaken"));
      } else {
        Alert.alert(t("error.title"), t("error.saveFailed"));
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Header onBack={() => router.back()} title={t("title")} />
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Header onBack={() => router.back()} title={t("title")} />
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{t("error.loadFailed")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const showRoleBadge = profile.role !== "user";
  const badgeColor = ROLE_BADGE_COLORS[profile.role];
  const roleLabel = showRoleBadge ? t(`roles.${profile.role}` as const) : null;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Header onBack={() => router.back()} title={t("title")} />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.avatarWrap}>
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </LinearGradient>
          {showRoleBadge && (
            <View style={[styles.roleBadge, { backgroundColor: badgeColor }]}>
              <Text style={styles.roleBadgeText}>{roleLabel}</Text>
            </View>
          )}
        </View>

        {editing ? (
          <EditableField
            label={t("labels.displayName")}
            value={displayNameInput}
            onChangeText={setDisplayNameInput}
            placeholder={t("labels.noDisplayName")}
            maxLength={50}
            autoCapitalize="words"
          />
        ) : (
          <Field
            label={t("labels.displayName")}
            value={profile.display_name}
            fallback={t("labels.noDisplayName")}
          />
        )}

        {editing ? (
          <EditableField
            label={t("labels.username")}
            value={usernameInput}
            onChangeText={setUsernameInput}
            placeholder={t("labels.noUsername")}
            maxLength={30}
            autoCapitalize="none"
            autoCorrect={false}
            prefix="@"
          />
        ) : (
          <Field
            label={t("labels.username")}
            value={profile.username ? `@${profile.username}` : null}
            fallback={t("labels.noUsername")}
          />
        )}

        <Field label={t("labels.email")} value={userEmail} disabled />

        {validationError && (
          <Text style={styles.validationError}>{validationError}</Text>
        )}

        {editing ? (
          <View style={styles.editActions}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              activeOpacity={0.85}
              onPress={cancelEditing}
              disabled={saving}
            >
              <Text style={styles.buttonSecondaryText}>{t("actions.cancel")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary, saving && styles.buttonDisabled]}
              activeOpacity={0.85}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.buttonPrimaryText}>
                {saving ? t("actions.saving") : t("actions.save")}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.editButton} activeOpacity={0.85} onPress={startEditing}>
            <Ionicons name="create-outline" size={18} color="#fff" />
            <Text style={styles.editButtonText}>{t("actions.editProfile")}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} hitSlop={12} style={styles.backButton}>
        <Ionicons name="chevron-back" size={26} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.backButton} />
    </View>
  );
}

function Field({
  label,
  value,
  fallback,
  disabled,
}: {
  label: string;
  value?: string | null;
  fallback?: string;
  disabled?: boolean;
}) {
  const isEmpty = !value;
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text
        style={[
          styles.fieldValue,
          isEmpty && styles.fieldValueEmpty,
          disabled && styles.fieldValueDisabled,
        ]}
      >
        {value || fallback || "—"}
      </Text>
    </View>
  );
}

function EditableField({
  label,
  value,
  onChangeText,
  placeholder,
  maxLength,
  autoCapitalize,
  autoCorrect,
  prefix,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoCorrect?: boolean;
  prefix?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputRow}>
        {prefix && <Text style={styles.inputPrefix}>{prefix}</Text>}
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#6b7280"
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0e0e0e" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8, paddingVertical: 12 },
  backButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, alignItems: "center" },
  avatarWrap: { alignItems: "center", marginTop: 12, marginBottom: 28 },
  avatar: { width: 110, height: 110, borderRadius: 55, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 38 },
  roleBadge: { marginTop: 12, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  roleBadgeText: { color: "#fff", fontWeight: "700", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  field: { width: "100%", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,0.08)", paddingVertical: 14 },
  fieldLabel: { color: "#9ca3af", fontSize: 12, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  fieldValue: { color: "#fff", fontSize: 16 },
  fieldValueEmpty: { color: "#6b7280", fontStyle: "italic" },
  fieldValueDisabled: { color: "#6b7280" },
  inputRow: { flexDirection: "row", alignItems: "center" },
  inputPrefix: { color: "#9ca3af", fontSize: 16, marginRight: 2 },
  input: { flex: 1, color: "#fff", fontSize: 16, paddingVertical: 0 },
  editButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 24, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", width: "100%" },
  editButtonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  editActions: { flexDirection: "row", gap: 12, marginTop: 24, width: "100%" },
  button: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  buttonPrimary: { backgroundColor: "#fff" },
  buttonPrimaryText: { color: "#000", fontSize: 15, fontWeight: "700" },
  buttonSecondary: { backgroundColor: "transparent", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  buttonSecondaryText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  buttonDisabled: { opacity: 0.5 },
  validationError: { color: "#ef4444", fontSize: 14, marginTop: 16, alignSelf: "flex-start" },
  errorWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  errorText: { color: "#ef4444", fontSize: 14 },
});