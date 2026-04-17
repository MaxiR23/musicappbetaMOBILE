import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface PlaybackButtonsProps {
  onPlay: () => void;
  onShuffle?: () => void;
  disabled?: boolean;
}

export default function PlaybackButtons({
  onPlay,
  onShuffle,
  disabled = false,
}: PlaybackButtonsProps) {
  const { t } = useTranslation("common");
  const shuffleDisabled = disabled || !onShuffle;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.playButton}
        onPress={onPlay}
        activeOpacity={0.85}
        disabled={disabled}
      >
        <Ionicons name="play" size={18} color="#000" />
        <Text style={[styles.buttonText, { color: "#000" }]}>{t("playback.play")}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.shuffleButton, shuffleDisabled && { opacity: 0.3 }]}
        onPress={onShuffle}
        activeOpacity={0.85}
        disabled={shuffleDisabled}
      >
        <Ionicons name="shuffle" size={18} color="#fff" />
        <Text style={styles.buttonText}>{t("playback.shuffle")}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: "center",
  },
  playButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 28,
    paddingVertical: 11,
    borderRadius: 100,
  },
  shuffleButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.10)",
    paddingHorizontal: 28,
    paddingVertical: 11,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.20)",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});