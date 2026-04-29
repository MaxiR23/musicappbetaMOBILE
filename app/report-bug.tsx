import { useBugReports } from "@/hooks/use-bug-reports";
import { BugCategory } from "@/types/bugReport";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const CATEGORIES: BugCategory[] = ["playback", "loading", "ui", "crash", "other"];

export default function ReportBugScreen() {
  const router = useRouter();
  const { t } = useTranslation("bugReport");
  const { submit } = useBugReports();

  const [category, setCategory] = useState<BugCategory | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setValidationError(null);

    if (!category) {
      setValidationError(t("error.categoryRequired"));
      return;
    }
    const trimmed = description.trim();
    if (trimmed.length < 5) {
      setValidationError(t("error.descriptionTooShort"));
      return;
    }
    if (trimmed.length > 2000) {
      setValidationError(t("error.descriptionTooLong"));
      return;
    }

    setSubmitting(true);
    try {
      await submit({ category, description: trimmed });
      Alert.alert(t("success.title"), t("success.message"), [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert(t("error.title"), t("error.submitFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Header onBack={() => router.back()} title={t("title")} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>{t("form.categoryLabel")}</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map(cat => {
              const active = category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip, active && styles.categoryChipActive]}
                  activeOpacity={0.85}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                    {t(`categories.${cat}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, { marginTop: 24 }]}>{t("form.descriptionLabel")}</Text>
          <TextInput
            style={styles.textArea}
            value={description}
            onChangeText={setDescription}
            placeholder={t("form.descriptionPlaceholder")}
            placeholderTextColor="#6b7280"
            multiline
            textAlignVertical="top"
            maxLength={2000}
          />
          <Text style={styles.hint}>{t("form.descriptionHint")}</Text>

          {validationError && (
            <Text style={styles.validationError}>{validationError}</Text>
          )}

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            activeOpacity={0.85}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? t("actions.submitting") : t("actions.submit")}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0e0e0e" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8, paddingVertical: 12 },
  backButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  label: { color: "#9ca3af", fontSize: 12, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", backgroundColor: "transparent" },
  categoryChipActive: { backgroundColor: "#fff", borderColor: "#fff" },
  categoryChipText: { color: "#fff", fontSize: 14, fontWeight: "500" },
  categoryChipTextActive: { color: "#000", fontWeight: "700" },
  textArea: { backgroundColor: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 15, padding: 14, borderRadius: 12, minHeight: 140, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  hint: { color: "#6b7280", fontSize: 12, marginTop: 6 },
  validationError: { color: "#ef4444", fontSize: 14, marginTop: 16 },
  submitButton: { backgroundColor: "#fff", paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 24 },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: "#000", fontSize: 15, fontWeight: "700" },
});