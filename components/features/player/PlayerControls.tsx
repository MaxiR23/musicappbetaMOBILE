import { Pause, Play, Repeat, Shuffle, SkipBack, SkipForward } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface PlayerControlsProps {
  isPlaying: boolean;
  hasPrev: boolean;
  hasNext: boolean;
  repeatOne: boolean;
  shuffled?: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToggleRepeat: () => void;
  onToggleShuffle?: () => void;
  accentColor?: string;
}

/**
 * Controles principales del player: shuffle, prev, play/pause, next, repeat
 */
export const PlayerControls = React.memo(({
  isPlaying,
  hasPrev,
  hasNext,
  repeatOne,
  shuffled,
  onTogglePlay,
  onPrev,
  onNext,
  onToggleRepeat,
  onToggleShuffle,
  accentColor = "#ffffff",
}: PlayerControlsProps) => {
  return (
    <View style={styles.controls}>
      <TouchableOpacity onPress={onToggleShuffle}>
        <View style={styles.shuffleWrap}>
          <Shuffle color={shuffled ? accentColor : "#fff"} size={28} />
          {shuffled && <View style={styles.shuffleDot} />}
        </View>
      </TouchableOpacity>

      <TouchableOpacity onPress={hasPrev ? onPrev : undefined} disabled={!hasPrev}>
        <SkipBack color={hasPrev ? "#fff" : "#888"} size={32} />
      </TouchableOpacity>

      <TouchableOpacity onPress={onTogglePlay} style={styles.playButton}>
        {isPlaying ? <Pause color="#fff" size={32} /> : <Play color="#fff" size={32} />}
      </TouchableOpacity>

      <TouchableOpacity onPress={hasNext ? onNext : undefined} disabled={!hasNext}>
        <SkipForward color={hasNext ? "#fff" : "#888"} size={32} />
      </TouchableOpacity>

      <TouchableOpacity onPress={onToggleRepeat}>
        <View style={styles.repeatWrap}>
          <Repeat size={28} color={repeatOne ? accentColor : "#fff"} />
          {repeatOne && <Text style={styles.repeatBadge}>1</Text>}
        </View>
      </TouchableOpacity>
    </View>
  );
});

PlayerControls.displayName = 'PlayerControls';

const styles = StyleSheet.create({
  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingHorizontal: 24,
  },
  playButton: {
    borderRadius: 999,
    width: 64,
    height: 64,
    justifyContent: "center",
    alignItems: "center",
  },
  repeatWrap: {
    position: "relative",
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  repeatBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    fontSize: 10,
    color: "#fff",
  },
  shuffleWrap: {
    position: "relative",
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  shuffleDot: {  
    position: "absolute",
    bottom: -4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#fff",
  },
});