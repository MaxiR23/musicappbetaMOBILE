import React from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { sharedTabStyles } from "./shared-tab-styles";

interface LyricsTabProps {
  lyricsText: string | null;
  lyricsLoading: boolean;
  lyricsError: string | null;
}

export const LyricsTab = React.memo(function LyricsTab({
  lyricsText,
  lyricsLoading,
  lyricsError,
}: LyricsTabProps) {
  const { t } = useTranslation("player");

  if (lyricsLoading) {
    return (
      <View style={sharedTabStyles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={sharedTabStyles.loadingText}>{t("lyrics.loading")}</Text>
      </View>
    );
  }

  if (lyricsError) {
    return (
      <View style={sharedTabStyles.errorContainer}>
        <Text style={sharedTabStyles.errorText}>{lyricsError}</Text>
      </View>
    );
  }

  if (lyricsText) {
    return (
      <View style={styles.lyricsContainer}>
        <Text style={styles.lyricsText}>{lyricsText}</Text>
      </View>
    );
  }

  return (
    <View style={sharedTabStyles.errorContainer}>
      <Text style={sharedTabStyles.placeholderText}>{t("lyrics.noLyrics")}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  lyricsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: "center",
  },
  lyricsText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 26,
    textAlign: "center",
    letterSpacing: 0.3,
  },
});