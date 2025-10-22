import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronDown } from "lucide-react-native";
import React, { useMemo } from "react";
import {
  Animated,
  Dimensions,
  Image,
  ImageBackground,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import TextTicker from "react-native-text-ticker";
import { usePlayerTabAnimation } from "../../../hooks/use-player-tab-animation";
import { PlayerControls } from "./PlayerControls";
import { PlayerTabs } from "./PlayerTabs";
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
  currentSong?: any;

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
  lyricsText: string | null;
  lyricsLoading: boolean;
  lyricsError: string | null;
  mainScrollRef: React.RefObject<ScrollView | null>;

  // Up Next
  upNextData: any;
  upNextLoading: boolean;
  upNextError: string | null;
  shouldShowUpNext: boolean;
  autoplayEnabled: boolean;

  // Related
  relatedData: any;
  relatedLoading: boolean;
  relatedError: string | null;
  shouldShowRelated: boolean;

  queue: any[];
  queueIndex: number;
  originalQueueSize: number;

  activePlayerTab: "upnext" | "lyrics" | "related" | null;

  // Callbacks
  onCollapse: () => void; // 🔥 Esta función ahora es "inteligente" y maneja tanto cerrar tab como colapsar
  onToggleLike: () => void;
  onOpenActions: () => void;
  onArtistPress: () => void;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToggleRepeat: () => void;
  onAutoplayToggle: (enabled: boolean) => void;
  onSlidingStart: () => void;
  onValueChange: (value: number) => void;
  onSlidingComplete: (value: number) => void;
  onFetchLyrics: () => Promise<void>;
  onFetchUpNext: () => Promise<void>;
  onTabChange: (tab: "upnext" | "lyrics" | "related" | null) => void;
  onFetchRelated: () => Promise<void>;
  setPanLocked: (locked: boolean) => void;
  formatTime: (ms: number) => string;
  accentColor?: string;

  // Callbacks para interacción con upNext/related
  onUpNextTrackPress?: (track: any, isFromAutoplay: boolean) => void;
  onRelatedTrackPress?: (track: any) => void;
  onRelatedArtistPress?: (artistId: string) => void;
  onRelatedAlbumPress?: (albumId: string) => void;
}

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
  currentSong,
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
  lyricsText,
  lyricsLoading,
  lyricsError,
  mainScrollRef,
  upNextData,
  upNextLoading,
  upNextError,
  shouldShowUpNext,
  autoplayEnabled,
  relatedData,
  relatedLoading,
  relatedError,
  shouldShowRelated,
  activePlayerTab,
  queue,
  queueIndex,
  originalQueueSize,
  onTabChange,
  onCollapse, // 🔥 Esta es la función inteligente que cierra tab primero, luego colapsa
  onToggleLike,
  onOpenActions,
  onArtistPress,
  onTogglePlay,
  onAutoplayToggle,
  onPrev,
  onNext,
  onToggleRepeat,
  onSlidingStart,
  onValueChange,
  onSlidingComplete,
  onFetchLyrics,
  onFetchUpNext,
  onFetchRelated,
  setPanLocked,
  formatTime,
  accentColor = "#ffffff",
  onUpNextTrackPress,
  onRelatedTrackPress,
  onRelatedArtistPress,
  onRelatedAlbumPress,
}: ExpandedPlayerProps) {
  // Hook de animación para transición player ↔ tabs
  const {
    coverScale: tabCoverScale,
    coverTranslateY,
    controlsOpacity,
    tabsOpacity,
    tabsTranslateY,
  } = usePlayerTabAnimation({ activeTab: activePlayerTab });

  // Determinar si mostrar tabs o player normal
  const showTabs = activePlayerTab !== null;

  // MarginTop dinámico según altura de pantalla
  const { height } = Dimensions.get("window");
  const dynamicTabMargin = useMemo(() => {
    if (height < 700) return 40;      // Pantallas chicas
    if (height < 800) return 60;      // Pantallas medianas
    return 90;                         // Pantallas grandes
  }, [height]);

  return (
    <Animated.View
      {...(activePlayerTab === null ? panHandlers : {})}
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

      {/* PLAYER NORMAL EXPANDIDO - Animado */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: controlsOpacity,
          },
        ]}
        pointerEvents={showTabs ? "none" : "auto"}
      >
        <ScrollView
          ref={mainScrollRef}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          contentContainerStyle={{
            paddingTop: 40,
            paddingHorizontal: 20,
            paddingBottom: 16,
          }}
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

            <View style={styles.sourceContainer}>
              <Text style={styles.sourceLabel}>
                {playSource?.type === "playlist" && "Desde playlist"}
                {playSource?.type === "album" && "Desde álbum"}
                {playSource?.type === "artist" && "Canciones de"}
              </Text>
              <Text style={styles.sourceName} numberOfLines={1} ellipsizeMode="tail">
                {playSource?.name ?? ""}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onOpenActions}
              style={{ padding: 4, width: 28, alignItems: "flex-end" }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Cover - Combinamos animaciones */}
          <Animated.View
            style={[
              styles.coverCard,
              {
                transform: [
                  { scale: Animated.multiply(coverScale, tabCoverScale) },
                  { translateY: coverTranslateY },
                ],
              },
            ]}
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

          {/* Meta (Título y Artista) + Like button a la derecha */}
          <View style={styles.metaWithActions}>
            <View style={styles.metaText}>
              <TextTicker
                style={styles.title}
                duration={12000}
                loop
                bounce={false}
                repeatSpacer={30}
                marqueeDelay={1000}
              >
                {title}
              </TextTicker>
              <TouchableOpacity onPress={onArtistPress} activeOpacity={1} style={{ alignSelf: "flex-start" }}>
                <Text style={styles.artist} numberOfLines={1}>
                  {artistName}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={onToggleLike}
              disabled={liking}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={22}
                color="#fff"
              />
            </TouchableOpacity>
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

          {/* TABS ESTILO YOUTUBE MUSIC */}
          <View style={[styles.tabsContainer, { marginTop: dynamicTabMargin }]}>
            <TouchableOpacity
              style={styles.tab}
              onPress={() => onTabChange("upnext")}
            >
              <Text style={[styles.tabText, activePlayerTab === "upnext" && styles.tabTextActive]}>
                UP NEXT
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tab}
              onPress={() => onTabChange("lyrics")}
            >
              <Text style={[styles.tabText, activePlayerTab === "lyrics" && styles.tabTextActive]}>
                LYRICS
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tab}
              onPress={() => onTabChange("related")}
            >
              <Text style={[styles.tabText, activePlayerTab === "related" && styles.tabTextActive]}>
                RELATED
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>

      {/* PLAYER TABS - Animado */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: tabsOpacity,
            transform: [{ translateY: tabsTranslateY }],
          },
        ]}
        pointerEvents={showTabs ? "box-none" : "none"}
      >
        {/* Contenedor interior con pointerEvents auto para capturar toques */}
        <View style={{ flex: 1 }} pointerEvents={showTabs ? "auto" : "none"}>
          <PlayerTabs
            initialTab={activePlayerTab || "upnext"}
            coverUrl={coverUrl}
            title={title}
            artistName={artistName}
            isPlaying={isPlaying}
            playSource={playSource}
            currentSong={currentSong}
            queue={queue}
            queueIndex={queueIndex}
            originalQueueSize={originalQueueSize}
            lyricsText={lyricsText}
            lyricsLoading={lyricsLoading}
            lyricsError={lyricsError}
            upNextData={upNextData}
            upNextLoading={upNextLoading}
            upNextError={upNextError}
            relatedData={relatedData}
            relatedLoading={relatedLoading}
            relatedError={relatedError}
            onTogglePlay={onTogglePlay}
            onCoverPress={() => onTabChange(null)} // 🔥 Cerrar tab cuando se presiona el cover
            onTabChange={(tab) => onTabChange(tab)}
            onFetchLyrics={onFetchLyrics}
            onFetchUpNext={onFetchUpNext}
            onFetchRelated={onFetchRelated}
            onUpNextTrackPress={onUpNextTrackPress}
            onRelatedTrackPress={onRelatedTrackPress} // 🆕
            onRelatedArtistPress={onRelatedArtistPress} // 🆕
            onRelatedAlbumPress={onRelatedAlbumPress} // 🆕
          />
        </View>
      </Animated.View>
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
  sourceContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 10,
  },
  sourceLabel: {
    color: "#999",
    fontSize: 11,
    textAlign: "center",
  },
  sourceName: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  coverCard: {
    width: 330,
    height: 350,
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
  metaWithActions: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
    marginLeft: 13,
    marginRight: 12,
  },
  metaText: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "left",
  },
  artist: { color: "#ccc", fontSize: 16 },
  
  // TABS ESTILO YOUTUBE MUSIC
  tabsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 0,
    gap: 30, // Espaciado entre tabs
  },
  tab: {
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tabText: {
    color: "#888",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: "#fff",
  },
});