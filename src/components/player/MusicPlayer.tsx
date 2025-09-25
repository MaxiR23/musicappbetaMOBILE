import TrackActionsSheet from "@/src/components/TrackActionsSheet";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams, useNavigation, usePathname } from "expo-router";
import { ChevronDown, Pause, Play, Repeat, Shuffle, SkipBack, SkipForward } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Dimensions,
  Image,
  ImageBackground,
  InteractionManager,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { getThemeFromImage } from "../../utils/colorUtils.native";
import { upgradeYtmImage } from "../../utils/ytmImage";
import { useMusic } from "./../../hooks/use-music";
// 👇 NUEVO import (usado solo para repeat)
import TrackPlayer, { RepeatMode } from "react-native-track-player";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const PROGRESS_HEIGHT = 2;
const PROGRESS_BG = "#444";
const TOUCH_HEIGHT = 28;
const SIDE_OVERFLOW = 16;

const ACCENT = "#ffffff" as const;
const ACCENT_TEXT = "#000" as const;

interface Props {
  isPlaying: boolean;
  progress: number;      // 0..1
  duration: number;      // ms
  currentTime: number;   // ms
  onTogglePlay: () => void;
  onSeek: (val01: number) => void;  // 0..1
  onNext: () => void;
  onPrev: () => void;
}

export default function MusicPlayer({
  isPlaying,
  progress,
  duration,
  currentTime,
  onTogglePlay,
  onSeek,
  onNext,
  onPrev,
}: Props) {
  const { currentSong, queue, queueIndex, playSource } = useMusic();
  const navigation = useNavigation();

  const [isExpanded, setIsExpanded] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const [gradient, setGradient] = useState<[string, string]>([
    "rgba(0,0,0,0.2)",
    "rgba(0,0,0,0.85)",
  ]);

  // NUEVO: sheet “Agregar a playlist”
  const [actionsOpen, setActionsOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<any | null>(null);

  // 👇 NUEVO: estado + toggle para repetir el tema actual
  const [repeatOne, setRepeatOne] = useState(false);
  const toggleRepeatOne = async () => {
    const next = !repeatOne;
    setRepeatOne(next);
    try {
      await TrackPlayer.setRepeatMode(next ? RepeatMode.Track : RepeatMode.Off);
    } catch (e) {
      console.warn("Repeat no soportado por RNTP, quedó en:", next ? "Track" : "Off", e);
    }
  };

  // ⬅️ MOVIDO ARRIBA (hooks siempre en el mismo orden)
  const pathname = usePathname();
  const _params = useLocalSearchParams<{ id?: string }>(); // eslint-disable-line @typescript-eslint/no-unused-vars
  const navigatingRef = useRef(false);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isExpanded ? 0 : SCREEN_HEIGHT,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isExpanded]);

  // Si está expandido, consumir el "atrás" (gesto o botón) y minimizar
  useEffect(() => {
    if (!isExpanded) return;
    const unsubNav = navigation.addListener?.("beforeRemove", (e: any) => {
      e.preventDefault();
      setIsExpanded(false);
    });
    const hw = BackHandler.addEventListener("hardwareBackPress", () => {
      setIsExpanded(false);
      return true;
    });
    return () => { unsubNav && unsubNav(); hw.remove(); };
  }, [isExpanded, navigation]);

  useEffect(() => {
    if (!currentSong?.thumbnail) return;
    (async () => {
      try {
        const src = upgradeYtmImage(currentSong.thumbnail, 512);
        const theme = await getThemeFromImage(src || currentSong.thumbnail);
        setGradient(theme.gradient);
      } catch {
        setGradient(["rgba(0,0,0,0.2)", "rgba(0,0,0,0.85)"]);
      }
    })();
  }, [currentSong?.thumbnail]);

  if (!currentSong) return null;

  // URLs en alta
  const thumbUrl = upgradeYtmImage(currentSong.thumbnail, 256);
  const coverUrl = upgradeYtmImage(currentSong.thumbnail, 600);
  const bgUrl = upgradeYtmImage(currentSong.thumbnail, 1200);

  const hasNext = queueIndex >= 0 && queueIndex < queue.length - 1;
  const hasPrev = queueIndex > 0;
  const clamped = Math.max(0, Math.min(1, progress));

  const formatMillis = (ms: number) => {
    const total = Math.max(0, Math.floor((ms || 0) / 1000));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const goToArtist = (artistId?: string) => {
    if (!artistId || navigatingRef.current) return;
    const match = pathname?.match(/\/artist\/([^/]+)/);
    const currentArtistInPath = match?.[1];
    if (currentArtistInPath && String(currentArtistInPath) === String(artistId)) {
      if (isExpanded) setIsExpanded(false);
      return;
    }
    const doNav = () => {
      navigatingRef.current = true;
      if (pathname && pathname.includes("/artist/")) router.replace(`/artist/${artistId}`);
      else router.push(`/artist/${artistId}`);
      setTimeout(() => { navigatingRef.current = false; }, 250);
    };
    if (isExpanded) {
      setIsExpanded(false);
      InteractionManager.runAfterInteractions(doNav);
    } else {
      doNav();
    }
  };

  return (
    <>
      {/* MINI PLAYER */}
      <View style={stylesMini.wrapper}>
        {/* barra de progreso NO intercepta toques */}
        <View style={stylesMini.progressContainer} pointerEvents="none">
          <View style={stylesMini.progressBg} />
          <View
            style={[
              stylesMini.progressFill,
              { width: `${clamped * 100}%`, backgroundColor: ACCENT },
            ]}
          />
          <Slider
            style={stylesMini.progressSlider}
            value={clamped}
            minimumValue={0}
            maximumValue={1}
            minimumTrackTintColor="transparent"
            maximumTrackTintColor="transparent"
            thumbTintColor="transparent"
            disabled
          />
        </View>

        <View style={stylesMini.container}>
          <Image source={{ uri: thumbUrl || currentSong.thumbnail }} style={stylesMini.thumbnail} />

          {/* INFO */}
          <View style={stylesMini.info}>
            <Pressable onPress={() => setIsExpanded(true)} hitSlop={6}>
              <Text style={stylesMini.title} numberOfLines={1}>
                {currentSong.title}
              </Text>
            </Pressable>
            <Pressable onPress={() => goToArtist(currentSong?.artistId)} style={{ alignSelf: "flex-start" }}>
              <Text style={stylesMini.artist}>{currentSong.artistName}</Text>
            </Pressable>
          </View>

          {/* Controles */}
          <TouchableOpacity onPress={onTogglePlay} style={stylesMini.iconButton}>
            <Ionicons name={isPlaying ? "pause" : "play"} size={22} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity onPress={hasNext ? onNext : undefined} style={stylesMini.iconButton} disabled={!hasNext}>
            <Ionicons name="play-skip-forward" size={22} color={hasNext ? "#fff" : "#555"} />
          </TouchableOpacity>
        </View>
      </View>

      {/* EXPANDIDO */}
      <Animated.View
        pointerEvents={isExpanded ? "auto" : "none"}
        style={[stylesExp.container, { transform: [{ translateY: slideAnim }] }]}
      >
        {/* Fondo */}
        <ImageBackground
          source={{ uri: bgUrl || currentSong.thumbnail }}
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

        <View style={stylesExp.topBar}>
          <TouchableOpacity onPress={() => setIsExpanded(false)}>
            <ChevronDown size={28} color="#fff" />
          </TouchableOpacity>

          <Text style={stylesExp.source} numberOfLines={1}>
            {playSource?.type === "playlist" && `Desde playlist: ${playSource.name}`}
            {playSource?.type === "album" && `Desde álbum: ${playSource.name}`}
            {playSource?.type === "artist" && `Canciones de ${playSource.name}`}
          </Text>

          {/* botón “más” */}
          <TouchableOpacity
            onPress={() => { setSelectedTrack(currentSong); setActionsOpen(true); }}
            style={{ padding: 4, width: 28, alignItems: "flex-end" }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={stylesExp.coverContainer}>
          <Image source={{ uri: coverUrl || currentSong.thumbnail }} style={stylesExp.coverImage} resizeMode="cover" />
        </View>

        <View style={stylesExp.meta}>
          <Text style={stylesExp.title} numberOfLines={2}>{currentSong.title}</Text>
          <Pressable onPress={() => goToArtist(currentSong?.artistId)} style={{ alignSelf: 'center' }}>
            <Text style={stylesExp.artist} numberOfLines={1}>{currentSong.artistName}</Text>
          </Pressable>
        </View>

        <View style={stylesExp.sliderContainer}>
          <Slider
            value={clamped}
            onSlidingComplete={onSeek}
            minimumValue={0}
            maximumValue={1}
            minimumTrackTintColor={ACCENT}
            maximumTrackTintColor="rgba(255,255,255,0.35)"
            thumbTintColor={ACCENT}
          />
          <View style={stylesExp.timeRow}>
            <Text style={stylesExp.time}>{formatMillis(currentTime)}</Text>
            <Text style={stylesExp.time}>{formatMillis(duration)}</Text>
          </View>
        </View>

        <View style={stylesExp.controls}>
          <TouchableOpacity><Shuffle color="#fff" size={28} /></TouchableOpacity>

          <TouchableOpacity onPress={hasPrev ? onPrev : undefined} disabled={!hasPrev}>
            <SkipBack color={hasPrev ? "#fff" : "#888"} size={32} />
          </TouchableOpacity>

          <TouchableOpacity onPress={onTogglePlay} style={[stylesExp.playButton, { backgroundColor: ACCENT }]}>
            {isPlaying ? <Pause color={ACCENT_TEXT} size={32} /> : <Play color={ACCENT_TEXT} size={32} />}
          </TouchableOpacity>

          <TouchableOpacity onPress={hasNext ? onNext : undefined} disabled={!hasNext}>
            <SkipForward color={hasNext ? "#fff" : "#888"} size={32} />
          </TouchableOpacity>

          {/* 👇 NUEVO: Repeat (repetir tema actual) */}
          <TouchableOpacity onPress={toggleRepeatOne}>
            <View style={stylesExp.repeatWrap}>
              <Repeat size={28} color={repeatOne ? ACCENT : "#fff"} />
              {repeatOne && <Text style={stylesExp.repeatBadge}>1</Text>}
            </View>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Sheet acciones */}
      <TrackActionsSheet
        open={actionsOpen}
        onOpenChange={setActionsOpen}
        track={selectedTrack}
      />
    </>
  );
}

/* ───────── STYLES ───────── */

const stylesMini = StyleSheet.create({
  wrapper: { position: "relative", backgroundColor: "#111" },
  progressContainer: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: 2,
    zIndex: 10,
    overflow: "visible",
  },
  progressBg: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "#444" },
  progressFill: { position: "absolute", left: 0, top: 0, bottom: 0 },
  progressSlider: {
    position: "absolute",
    left: -16,
    right: -16,
    top: -(28 - 2) / 2,
    height: 28,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  thumbnail: { width: 48, height: 48, borderRadius: 6 },
  info: { flex: 1, marginHorizontal: 12 },
  title: { color: "#fff", fontSize: 14, fontWeight: "500" },
  artist: { color: "#aaa", fontSize: 12 },
  iconButton: { paddingHorizontal: 8 },
});

const stylesExp = StyleSheet.create({
  container: {
    position: "absolute",
    zIndex: 9999,
    height: SCREEN_HEIGHT,
    width: "100%",
    backgroundColor: "#000",
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  source: { color: "#ccc", fontSize: 12, textAlign: "center", flex: 1, marginHorizontal: 10 },
  coverContainer: { alignItems: "center", marginBottom: 20 },
  coverImage: { width: 320, height: 340, borderRadius: 16 },
  meta: { alignItems: "center", marginBottom: 20 },
  title: { color: "#fff", fontSize: 22, fontWeight: "bold", textAlign: "center" },
  artist: { color: "#ccc", fontSize: 16 },
  sliderContainer: { width: "100%", marginBottom: 12 },
  timeRow: { flexDirection: "row", justifyContent: "space-between" },
  time: { color: "#ccc", fontSize: 12 },
  controls: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 24, paddingHorizontal: 10 },
  playButton: { borderRadius: 999, width: 64, height: 64, justifyContent: "center", alignItems: "center" },

  // NUEVO: decorado del ícono Repeat "1"
  repeatWrap: { position: "relative", width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  repeatBadge: { position: "absolute", bottom: -2, right: -2, fontSize: 10, color: "#fff" },
});
