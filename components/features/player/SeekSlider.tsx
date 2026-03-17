import * as PlayerService from "@/services/PlayerService";
import { formatDuration } from "@/utils/durations";
import Slider from "@react-native-community/slider";
import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useProgress } from "react-native-track-player";

export const SeekSlider = React.memo(function SeekSlider() {
  const { position, duration } = useProgress(1000);

  const [dragging, setDragging] = useState(false);
  const [localVal, setLocalVal] = useState(0);
  const knobScale = useRef(new Animated.Value(1)).current;

  const progress = duration > 0 ? position / duration : 0;
  const clamped = Math.max(0, Math.min(1, progress));

  useEffect(() => {
    if (!dragging) setLocalVal(clamped);
  }, [clamped, dragging]);

  const startDrag = () => {
    setDragging(true);
    Animated.spring(knobScale, {
      toValue: 1.25,
      useNativeDriver: true,
      friction: 6,
    }).start();
  };

  const endDrag = async (v: number) => {
    Animated.spring(knobScale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 6,
    }).start();
    setDragging(false);
    await PlayerService.seekTo(v * duration);
  };

  const displayCurrentMs = dragging
    ? Math.round(localVal * (duration * 1000 || 0))
    : position * 1000;

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
          onSlidingStart={startDrag}
          onValueChange={setLocalVal}
          onSlidingComplete={endDrag}
          minimumValue={0}
          maximumValue={1}
          minimumTrackTintColor="transparent"
          maximumTrackTintColor="transparent"
          thumbTintColor="transparent"
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={styles.timeRow}>
        <Text style={styles.time}>{formatDuration(displayCurrentMs)}</Text>
        <Text style={styles.time}>{formatDuration(duration * 1000)}</Text>
      </View>
    </View>
  );
});

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