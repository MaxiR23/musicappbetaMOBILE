import Slider from "@react-native-community/slider";
import React from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

interface SeekSliderProps {
  localVal: number; // 0..1
  dragging: boolean;
  knobScale: Animated.Value;
  displayCurrentMs: number;
  duration: number;
  formatTime: (ms: number) => string;
  onSlidingStart: () => void;
  onValueChange: (value: number) => void;
  onSlidingComplete: (value: number) => void;
}

/**
 * Slider de progreso con estilo Apple
 * Incluye track, fill, knob animado y tiempos
 */
export function SeekSlider({
  localVal,
  dragging,
  knobScale,
  displayCurrentMs,
  duration,
  formatTime,
  onSlidingStart,
  onValueChange,
  onSlidingComplete,
}: SeekSliderProps) {
  return (
    <View style={styles.sliderContainer}>
      <View style={styles.wrap}>
        <View style={styles.track} />
        <View style={[styles.fill, { width: `${localVal * 100}%` }]} />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.knob,
            {
              left: `${localVal * 100}%`,
              transform: [{ translateX: -7 }, { scale: knobScale }],
              opacity: dragging ? 1 : 0,
            },
          ]}
        />
        <Slider
          value={localVal}
          onSlidingStart={onSlidingStart}
          onValueChange={onValueChange}
          onSlidingComplete={onSlidingComplete}
          minimumValue={0}
          maximumValue={1}
          minimumTrackTintColor="transparent"
          maximumTrackTintColor="transparent"
          thumbTintColor="transparent"
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={styles.timeRow}>
        <Text style={styles.time}>{formatTime(displayCurrentMs)}</Text>
        <Text style={styles.time}>{formatTime(duration)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sliderContainer: {
    width: "92%",
    marginBottom: 12,
    justifyContent: "center",
    alignSelf: "center",
  },
  wrap: { height: 28, justifyContent: "center" },
  track: {
    height: 6,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  fill: {
    position: "absolute",
    left: 0,
    height: 6,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  knob: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#fff",
    top: 7,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  time: { color: "#ccc", fontSize: 12 },
});