import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import Svg, { Circle } from "react-native-svg";

export type DownloadState = "none" | "queued" | "downloading" | "done";
export type LibraryState = "none" | "added";

const RING_SIZE = 44;
const RING_STROKE = 2.5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface PlaybackButtonsProps {
  onPlay: () => void;
  onShuffle?: () => void;
  disabled?: boolean;

  onLibrary?: () => void;
  libraryState?: LibraryState;

  onDownload?: () => void;
  downloadState?: DownloadState;
  downloadProgress?: number;
}

export default function PlaybackButtons({
  onPlay,
  onShuffle,
  disabled = false,
  onLibrary,
  libraryState = "none",
  onDownload,
  downloadState = "none",
  downloadProgress = 0,
}: PlaybackButtonsProps) {
  const { t } = useTranslation("common");
  const shuffleDisabled = disabled || !onShuffle;

  const showLibrary = !!onLibrary;
  const showDownload = !!onDownload && (!onLibrary || libraryState === "added");

  const clampedProgress = Math.max(0, Math.min(1, downloadProgress));
  const strokeDashoffset = RING_CIRCUMFERENCE * (1 - clampedProgress);

  const checkScale = useSharedValue(libraryState === "added" ? 1 : 0);
  const plusScale = useSharedValue(libraryState === "none" ? 1 : 0);

  useEffect(() => {
    if (libraryState === "added") {
      plusScale.value = withTiming(0, { duration: 120 });
      checkScale.value = withSequence(
        withTiming(0, { duration: 0 }),
        withSpring(1.2, { damping: 8, stiffness: 180 }),
        withSpring(1, { damping: 10, stiffness: 200 }),
      );
    } else {
      checkScale.value = withTiming(0, { duration: 120 });
      plusScale.value = withSpring(1, { damping: 12, stiffness: 200 });
    }
  }, [libraryState, checkScale, plusScale]);

  const plusAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: plusScale.value }],
    opacity: plusScale.value,
    position: "absolute",
  }));

  const checkAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
    position: "absolute",
  }));

  const spinRotation = useSharedValue(0);

  useEffect(() => {
    if (downloadState === "queued") {
      spinRotation.value = 0;
      spinRotation.value = withRepeat(
        withTiming(360, { duration: 1000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      cancelAnimation(spinRotation);
      spinRotation.value = 0;
    }
  }, [downloadState, spinRotation]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinRotation.value}deg` }],
  }));

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

      {showLibrary && (
        <TouchableOpacity
          style={[
            styles.iconButton,
            libraryState === "added" && styles.iconButtonActive,
          ]}
          onPress={onLibrary}
          activeOpacity={0.85}
        >
          <Animated.View style={plusAnimStyle}>
            <Ionicons name="add" size={24} color="#fff" />
          </Animated.View>
          <Animated.View style={checkAnimStyle}>
            <Ionicons name="checkmark" size={20} color="#000" />
          </Animated.View>
        </TouchableOpacity>
      )}

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
          ) : downloadState === "queued" ? (
            <View style={styles.progressWrap}>
              <Animated.View style={[StyleSheet.absoluteFill, spinStyle]}>
                <Svg width={RING_SIZE} height={RING_SIZE}>
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
                    strokeDasharray={`${RING_CIRCUMFERENCE * 0.25} ${RING_CIRCUMFERENCE * 0.75}`}
                    strokeLinecap="round"
                  />
                </Svg>
              </Animated.View>
              <Ionicons name="stop" size={12} color="#fff" />
            </View>
          ) : downloadState === "done" ? (
            <Ionicons name="checkmark-done" size={20} color="#000" />
          ) : (
            <Ionicons name="cloud-download-outline" size={22} color="#fff" />
          )}
        </TouchableOpacity>
      )}
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