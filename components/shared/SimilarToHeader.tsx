import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { memo } from "react";
import { useTranslation } from "react-i18next";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

type Props = {
  label?: string;
  name?: string | null;
  thumb?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

function SimilarToHeaderBase({
  label,
  name,
  thumb,
  size = 48,
  style,
}: Props) {
  const { t } = useTranslation("home");
  const radius = size / 2;

  const resolvedLabel = label ?? t("sections.similarTo.label");
  const resolvedName = name ?? t("sections.similarTo.fallbackName");

  return (
    <View style={[styles.row, style]}>
      {thumb ? (
        <Image source={thumb} style={{ width: size, height: size, borderRadius: radius }} />
      ) : (
        <View style={[styles.fallback, { width: size, height: size, borderRadius: radius }]}>
          <Ionicons name="person-outline" size={Math.max(18, size * 0.45)} color="#777" />
        </View>
      )}
      <View style={{ flexShrink: 1 }}>
        <Text style={styles.label}>{resolvedLabel}</Text>
        <Text numberOfLines={1} style={styles.name}>{resolvedName}</Text>
      </View>
    </View>
  );
}

export default memo(SimilarToHeaderBase);

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10, marginTop: 10 },
  fallback: { backgroundColor: "#222", alignItems: "center", justifyContent: "center" },
  label: { color: "#aaa", fontSize: 13, fontWeight: "600" },
  name: { color: "#fff", fontSize: 18, fontWeight: "700" },
});