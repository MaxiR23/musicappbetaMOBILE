import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar
} from "react-native";
import Slider from "@react-native-community/slider";
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronDown, Shuffle, SkipBack, SkipForward, Repeat, Play, Pause } from "lucide-react-native";

import { useMusic } from "./../../hooks/use-music";
import { getAverageColor, rgba } from "../../utils/colorUtils.native";

const SCREEN_HEIGHT = Dimensions.get("window").height;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  progress: number;
  duration: number;
  currentTime: number;
  onSeek: (val: number) => void;
  onNext: () => void;
  onPrev: () => void;
}

export const ExpandedMusicPlayer = ({
  isOpen,
  onClose,
  isPlaying,
  onTogglePlay,
  progress,
  duration,
  currentTime,
  onSeek,
  onNext,
  onPrev
}: Props) => {
  const { currentSong, queue, queueIndex, playSource } = useMusic();
  const [bgColors, setBgColors] = useState<string[]>(["#000000", "#1e1e1e"]);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const hasNext = queueIndex >= 0 && queueIndex < queue.length - 1;
  const hasPrev = queueIndex > 0;
  const hasSong = !!currentSong;

  const formatTime = (seconds: number) => {
    const total = Math.round(seconds);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    if (!currentSong?.thumbnail) return;

    (async () => {
      const avg = await getAverageColor(currentSong.thumbnail);
      const darken = (c: [number, number, number]) =>
        c.map(n => Math.max(0, n - 60)) as [number, number, number];

      const lighten = (c: [number, number, number]) =>
        c.map(n => Math.min(255, n + 80)) as [number, number, number];

      const top = rgba(lighten(avg as any), 0.85);
      const bottom = rgba(darken(avg as any), 0.95);

      setBgColors([bottom, top]);
    })();
  }, [currentSong]);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isOpen ? 0 : SCREEN_HEIGHT,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOpen]);

  if (!hasSong) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }] }
      ]}
    >
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFill} />

      <StatusBar barStyle="light-content" />

      <View style={styles.topBar}>
        <TouchableOpacity onPress={onClose}>
          <ChevronDown size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.source}>
          {playSource?.type === "playlist" && `Desde playlist: ${playSource.name}`}
          {playSource?.type === "album" && `Desde álbum: ${playSource.name}`}
          {playSource?.type === "artist" && `Canciones de ${playSource.name}`}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.coverContainer}>
        <Image
          source={{ uri: currentSong.thumbnail }}
          style={styles.coverImage}
          resizeMode="cover"
        />
      </View>

      <View style={styles.meta}>
        <Text style={styles.title}>{currentSong.title}</Text>
        <Text style={styles.artist}>{currentSong.artistName}</Text>
      </View>

      <View style={styles.sliderContainer}>
        <Slider
          value={progress}
          onValueChange={onSeek}
          minimumValue={0}
          maximumValue={100}
          minimumTrackTintColor="#fff"
          maximumTrackTintColor="rgba(255,255,255,0.4)"
          thumbTintColor="#fff"
        />
        <View style={styles.timeRow}>
          <Text style={styles.time}>{formatTime(currentTime)}</Text>
          <Text style={styles.time}>{formatTime(duration)}</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity>
          <Shuffle color="#fff" size={28} />
        </TouchableOpacity>
        <TouchableOpacity onPress={hasPrev ? onPrev : undefined} disabled={!hasPrev}>
          <SkipBack color={hasPrev ? "#fff" : "#888"} size={32} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onTogglePlay}
          style={styles.playButton}
          disabled={!hasSong}
        >
          {isPlaying ? (
            <Pause color="#000" size={32} />
          ) : (
            <Play color="#000" size={32} />
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={hasNext ? onNext : undefined} disabled={!hasNext}>
          <SkipForward color={hasNext ? "#fff" : "#888"} size={32} />
        </TouchableOpacity>
        <TouchableOpacity>
          <Repeat color="#fff" size={28} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    zIndex: 9999,
    height: SCREEN_HEIGHT,
    width: "100%",
    backgroundColor: "#000",
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  source: {
    color: "#ccc",
    fontSize: 12,
    textAlign: "center",
    flex: 1,
    marginHorizontal: 10,
  },
  coverContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  coverImage: {
    width: 250,
    height: 250,
    borderRadius: 16,
  },
  meta: {
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
  },
  artist: {
    color: "#ccc",
    fontSize: 16,
  },
  sliderContainer: {
    width: "100%",
    marginBottom: 12,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  time: {
    color: "#ccc",
    fontSize: 12,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
    paddingHorizontal: 10,
  },
  playButton: {
    backgroundColor: "#fff",
    borderRadius: 999,
    width: 64,
    height: 64,
    justifyContent: "center",
    alignItems: "center",
  },
});