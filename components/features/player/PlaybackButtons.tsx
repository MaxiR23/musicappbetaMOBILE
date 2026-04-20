import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

// TEST offline {
export type DownloadState = "none" | "downloading" | "done";

const RING_SIZE = 44;
const RING_STROKE = 2.5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
// TEST offline }

interface PlaybackButtonsProps {
  onPlay: () => void;
  onShuffle?: () => void;
  disabled?: boolean;

  // TEST offline {
  onDownload?: () => void;
  downloadState?: DownloadState;
  downloadProgress?: number;
  // TEST offline }
}

export default function PlaybackButtons({
  onPlay,
  onShuffle,
  disabled = false,
  // TEST offline {
  onDownload,
  downloadState = "none",
  downloadProgress = 0,
  // TEST offline }
}: PlaybackButtonsProps) {
  const { t } = useTranslation("common");
  const shuffleDisabled = disabled || !onShuffle;

  // TEST offline {
  const showDownload = !!onDownload;
  const clampedProgress = Math.max(0, Math.min(1, downloadProgress));
  const strokeDashoffset = RING_CIRCUMFERENCE * (1 - clampedProgress);
  // TEST offline }

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
      </TouchableOpacity>

      {/* TEST offline { */}
      {showDownload && (
        <TouchableOpacity
          style={[
            styles.iconButton,
            downloadState === "done" && styles.iconButtonActive,
          ]}
          onPress={onDownload}
          activeOpacity={0.85}
        >
          {downloadState === "downloading" ? (
            <View style={styles.progressWrap}>
              <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
                <Circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth={RING_STROKE}
                  fill="none"
                />
                <Circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  stroke="#fff"
                  strokeWidth={RING_STROKE}
                  fill="none"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
                />
              </Svg>
              <Ionicons name="stop" size={12} color="#fff" />
            </View>
          ) : downloadState === "done" ? (
            <Ionicons name="checkmark" size={20} color="#000" />
          ) : (
            <Ionicons name="cloud-download-outline" size={22} color="#fff" />
          )}
        </TouchableOpacity>
      )}
      {/* TEST offline } */}
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
    alignItems: "center",
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
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    width: 44,
    height: 44,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.20)",
  },
  iconButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    width: 44,
    height: 44,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.20)",
  },
  iconButtonActive: {
    backgroundColor: "#fff",
    borderColor: "#fff",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  progressWrap: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});