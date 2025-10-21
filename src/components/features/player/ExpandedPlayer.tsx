import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronDown } from "lucide-react-native";
import React from "react";
import {
  Animated,
  Dimensions,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LyricsSection } from "./LyricsSection";
import { PlayerControls } from "./PlayerControls";
import { SeekSlider } from "./SeekSlider";

const SCREEN_HEIGHT = Dimensions.get("window").height;

interface ExpandedPlayerProps {
  // Estado y animaciones
  isExpanded: boolean;
  slideAnim: Animated.Value;
  panHandlers: any;

  // Imágenes y tema
  bgUrl: string;
  coverUrl: string;
  gradient: [string, string];
  coverScale: Animated.Value;

  // Metadata
  title: string;
  artistName: string;
  artistId: string | null;
  playSource: any;

  // Estados de reproducción
  isPlaying: boolean;
  hasPrev: boolean;
  hasNext: boolean;
  repeatOne: boolean;

  // Like
  isLiked: boolean;
  liking: boolean;

  // Seek slider
  localVal: number;
  dragging: boolean;
  knobScale: Animated.Value;
  displayCurrentMs: number;
  duration: number;

  // Lyrics
  lyricsOpen: boolean;
  lyricsText: string | null;
  lyricsLoading: boolean;
  lyricsError: string | null;
  mainScrollRef: React.RefObject<ScrollView | null>;

  // Callbacks
  onCollapse: () => void;
  onToggleLike: () => void;
  onOpenActions: () => void;
  onArtistPress: () => void;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToggleRepeat: () => void;
  onSlidingStart: () => void;
  onValueChange: (value: number) => void;
  onSlidingComplete: (value: number) => void;
  onToggleLyrics: () => void;
  setPanLocked: (locked: boolean) => void;
  formatTime: (ms: number) => string;
  accentColor?: string;
}

/**
 * Vista expandida completa del player
 * Incluye fondo, cover, controles, slider y lyrics
 */
export function ExpandedPlayer({
  isExpanded,
  slideAnim,
  panHandlers,
  bgUrl,
  coverUrl,
  gradient,
  coverScale,
  title,
  artistName,
  artistId,
  playSource,
  isPlaying,
  hasPrev,
  hasNext,
  repeatOne,
  isLiked,
  liking,
  localVal,
  dragging,
  knobScale,
  displayCurrentMs,
  duration,
  lyricsOpen,
  lyricsText,
  lyricsLoading,
  lyricsError,
  mainScrollRef,
  onCollapse,
  onToggleLike,
  onOpenActions,
  onArtistPress,
  onTogglePlay,
  onPrev,
  onNext,
  onToggleRepeat,
  onSlidingStart,
  onValueChange,
  onSlidingComplete,
  onToggleLyrics,
  setPanLocked,
  formatTime,
  accentColor = "#ffffff",
}: ExpandedPlayerProps) {
  return (
    <Animated.View
      {...panHandlers}
      pointerEvents={isExpanded ? "auto" : "none"}
      style={[styles.container, { transform: [{ translateY: slideAnim }] }]}
    >
      {/* Fondo con blur */}
      <ImageBackground
        source={{ uri: bgUrl }}
        style={StyleSheet.absoluteFill}
        blurRadius={50}
        resizeMode="cover"
        imageStyle={{ backgroundColor: "#000" }}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>

      <StatusBar barStyle="light-content" />

      {/* Contenido scrolleable */}
      <ScrollView
        ref={mainScrollRef}
        nestedScrollEnabled
        showsVerticalScrollIndicator={lyricsOpen}
        scrollEnabled={lyricsOpen}
        bounces={lyricsOpen}
        overScrollMode={lyricsOpen ? "auto" : "never"}
        contentContainerStyle={{
          paddingTop: 40,
          paddingHorizontal: 20,
          paddingBottom: lyricsOpen ? 40 : 16,
        }}
        onScrollBeginDrag={() => setPanLocked(true)}
        onMomentumScrollEnd={() => setPanLocked(false)}
        onScrollEndDrag={() => setPanLocked(false)}
        scrollEventThrottle={16}
      >
        {/* Drag Handle */}
        <View style={styles.dragHandleArea} pointerEvents="box-none">
          <View style={styles.dragHandle} />
        </View>

        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onCollapse}>
            <ChevronDown size={28} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.source} numberOfLines={1}>
            {playSource?.type === "playlist" &&
              `Desde playlist: ${playSource.name ?? ""}`}
            {playSource?.type === "album" &&
              `Desde álbum: ${playSource.name ?? ""}`}
            {playSource?.type === "artist" &&
              `Canciones de ${playSource.name ?? ""}`}
          </Text>

          <TouchableOpacity
            onPress={onToggleLike}
            disabled={liking}
            style={{
              padding: 4,
              width: 28,
              alignItems: "center",
              marginRight: 6,
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={22}
              color="#fff"
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onOpenActions}
            style={{ padding: 4, width: 28, alignItems: "flex-end" }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Cover */}
        <Animated.View
          style={[styles.coverCard, { transform: [{ scale: coverScale }] }]}
        >
          <Image
            source={{ uri: coverUrl }}
            style={styles.coverImage}
            resizeMode="cover"
          />
          <LinearGradient
            pointerEvents="none"
            colors={[
              "rgba(255,255,255,0.06)",
              "rgba(0,0,0,0)",
              "rgba(0,0,0,0.35)",
            ]}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* Meta (Título y Artista) */}
        <View style={styles.meta}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <Pressable onPress={onArtistPress} style={{ alignSelf: "center" }}>
            <Text style={styles.artist} numberOfLines={1}>
              {artistName}
            </Text>
          </Pressable>
        </View>

        {/* Seek Slider */}
        <SeekSlider
          localVal={localVal}
          dragging={dragging}
          knobScale={knobScale}
          displayCurrentMs={displayCurrentMs}
          duration={duration}
          formatTime={formatTime}
          onSlidingStart={onSlidingStart}
          onValueChange={onValueChange}
          onSlidingComplete={onSlidingComplete}
        />

        {/* Player Controls */}
        <PlayerControls
          isPlaying={isPlaying}
          hasPrev={hasPrev}
          hasNext={hasNext}
          repeatOne={repeatOne}
          onTogglePlay={onTogglePlay}
          onPrev={onPrev}
          onNext={onNext}
          onToggleRepeat={onToggleRepeat}
          accentColor={accentColor}
        />

        {/* Lyrics Section */}
        <LyricsSection
          lyricsOpen={lyricsOpen}
          lyricsText={lyricsText}
          lyricsLoading={lyricsLoading}
          lyricsError={lyricsError}
          trackTitle={title}
          artistName={artistName}
          onToggleLyrics={onToggleLyrics}
          onScrollBeginDrag={() => setPanLocked(true)}
          onScrollEnd={() => setPanLocked(false)}
        />
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    zIndex: 9999,
    height: SCREEN_HEIGHT,
    width: "100%",
    backgroundColor: "#000",
  },
  dragHandleArea: {
    position: "absolute",
    top: 18,
    left: 0,
    right: 0,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.5)",
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
  coverCard: {
    width: 320,
    height: 340,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
    alignSelf: "center",
    marginBottom: 20,
  },
  coverImage: { width: "100%", height: "100%" },
  meta: { alignItems: "center", marginBottom: 20 },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
  },
  artist: { color: "#ccc", fontSize: 16 },
});