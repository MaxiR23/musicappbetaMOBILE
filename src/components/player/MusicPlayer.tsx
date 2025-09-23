import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
  ImageBackground,
  InteractionManager,
  Pressable,
  BackHandler
} from "react-native";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronDown, Shuffle, SkipBack, SkipForward, Repeat, Play, Pause } from "lucide-react-native";
import { router, usePathname, useLocalSearchParams, useNavigation } from "expo-router";
import { useMusic } from "./../../hooks/use-music";
import { getThemeFromImage } from "../../utils/colorUtils.native";
import { upgradeYtmImage } from "../../utils/ytmImage";

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
    if (!isExpanded) return; // activo solo cuando está expandido

    // Navegación (gesto/back del stack)
    const unsubNav = navigation.addListener?.("beforeRemove", (e: any) => {
      e.preventDefault();           // cancela el pop
      setIsExpanded(false);         // minimiza
    });

    // Botón físico de back en Android
    const hw = BackHandler.addEventListener("hardwareBackPress", () => {
      setIsExpanded(false); // minimiza
      return true;          // consumimos el evento
    });

    return () => {
      unsubNav && unsubNav();
      hw.remove();
    };
  }, [isExpanded, navigation]);

  useEffect(() => {
    if (!currentSong?.thumbnail) return;
    (async () => {
      try {
        const src = upgradeYtmImage(currentSong.thumbnail, 512); // mejor fuente para extraer colores
        const theme = await getThemeFromImage(src || currentSong.thumbnail);
        setGradient(theme.gradient);
      } catch {
        setGradient(["rgba(0,0,0,0.2)", "rgba(0,0,0,0.85)"]);
      }
    })();
  }, [currentSong?.thumbnail]);

  if (!currentSong) return null;

  // URLs en alta para cada uso
  const thumbUrl = upgradeYtmImage(currentSong.thumbnail, 256);   // mini player / íconos
  const coverUrl = upgradeYtmImage(currentSong.thumbnail, 600);   // cover del expandido
  const bgUrl = upgradeYtmImage(currentSong.thumbnail, 1200);  // fondo blur del expandido

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
      if (pathname && pathname.includes("/artist/")) {
        router.replace(`/artist/${artistId}`);
      } else {
        router.push(`/artist/${artistId}`);
      }
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

          {/* INFO: Título (expande) y Artista (navega) como zonas separadas */}
          <View style={stylesMini.info}>
            <Pressable onPress={() => setIsExpanded(true)} hitSlop={6}>
              <Text style={stylesMini.title} numberOfLines={1}>
                {currentSong.title}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => goToArtist(currentSong?.artistId)}
              style={{ alignSelf: "flex-start" }}
            >
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
        {/* Fondo = portada blur + scrim */}
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
          <View style={{ width: 28 }} />
        </View>

        <View style={stylesExp.coverContainer}>
          <Image source={{ uri: coverUrl || currentSong.thumbnail }} style={stylesExp.coverImage} resizeMode="cover" />
        </View>

        <View style={stylesExp.meta}>
          <Text style={stylesExp.title} numberOfLines={2}>{currentSong.title}</Text>

          {/* En expandido: tocar artista → navega (solo acá) */}
          <Pressable
            onPress={() => goToArtist(currentSong?.artistId)}
            style={{ alignSelf: 'center' }}
          >
            <Text style={stylesExp.artist} numberOfLines={1}>
              {currentSong.artistName}
            </Text>
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
          <TouchableOpacity><Repeat color="#fff" size={28} /></TouchableOpacity>
        </View>
      </Animated.View>
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
});