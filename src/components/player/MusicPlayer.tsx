import TrackActionsSheet from "@/src/components/TrackActionsSheet";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams, useNavigation, usePathname } from "expo-router";
import { ChevronDown, Pause, Play, Repeat, Shuffle, SkipBack, SkipForward } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Dimensions,
  Image,
  ImageBackground,
  InteractionManager,
  PanResponder,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import TrackPlayer, { RepeatMode } from "react-native-track-player";
import { useMusicApi } from "../../hooks/use-music-api";
import { getThemeFromImage } from "../../utils/colorUtils.native";
import { upgradeYtmImage } from "../../utils/ytmImage";
import { useMusic } from "./../../hooks/use-music";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const ACCENT = "#ffffff" as const;

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

const first = (...vals: any[]) => vals.find(v => v !== undefined && v !== null && v !== "");

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

  const { likeTrack, unlikeTrack, isTrackLiked, getTrackLyrics } = useMusicApi() as any;

  const [isExpanded, setIsExpanded] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const isExpandedRef = useRef(isExpanded);
  useEffect(() => { isExpandedRef.current = isExpanded; }, [isExpanded]);

  // bloquear pan mientras se scrollea
  const [panLocked, setPanLocked] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_e, g) =>
        isExpandedRef.current && !panLocked && g.dy > 8 && Math.abs(g.dx) < 8,
      onMoveShouldSetPanResponderCapture: (_e, g) =>
        isExpandedRef.current && !panLocked && g.dy > 8 && Math.abs(g.dx) < 8,
      onPanResponderGrant: () => { slideAnim.stopAnimation(); },
      onPanResponderMove: (_e, g) => {
        if (!isExpandedRef.current || panLocked) return;
        const y = Math.min(Math.max(g.dy, 0), SCREEN_HEIGHT);
        slideAnim.setValue(y);
      },
      onPanResponderRelease: (_e, g) => {
        if (!isExpandedRef.current || panLocked) return;
        const shouldClose = g.vy > 0.7 || g.dy > SCREEN_HEIGHT * 0.2;
        Animated.timing(slideAnim, {
          toValue: shouldClose ? SCREEN_HEIGHT : 0,
          duration: 220,
          useNativeDriver: true,
        }).start(() => { if (shouldClose) setIsExpanded(false); });
      },
    })
  ).current;

  const [gradient, setGradient] = useState<[string, string]>([
    "rgba(0,0,0,0.2)",
    "rgba(0,0,0,0.85)",
  ]);

  const [actionsOpen, setActionsOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<any | null>(null);

  const [repeatOne, setRepeatOne] = useState(false);
  const toggleRepeatOne = async () => {
    const next = !repeatOne;
    setRepeatOne(next);
    try { await TrackPlayer.setRepeatMode(next ? RepeatMode.Track : RepeatMode.Off); }
    catch (e) { console.warn("Repeat no soportado por RNTP, quedó en:", next ? "Track" : "Off", e); }
  };

  const pathname = usePathname();
  useLocalSearchParams<{ id?: string }>(); // se mantiene
  const navigatingRef = useRef(false);

  // ❤️ like/unlike
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [liking, setLiking] = useState<boolean>(false);

  // LYRICS
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [lyricsText, setLyricsText] = useState<string | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsError, setLyricsError] = useState<string | null>(null);
  const mainScrollRef = useRef<ScrollView>(null);

  const fetchLyrics = async () => {
    if (!currentSong?.id) return;
    setLyricsLoading(true);
    setLyricsError(null);
    try {
      const res = await getTrackLyrics(String(currentSong.id));
      if (!res?.ok || !res?.lyrics) {
        setLyricsText(null);
        setLyricsError("No hay letras para este tema.");
      } else {
        const txt = String(res.lyrics).replace(/\r\n/g, "\n").trim();
        setLyricsText(txt || null);
      }
    } catch {
      setLyricsText(null);
      setLyricsError("No se pudieron cargar las letras.");
    } finally {
      setLyricsLoading(false);
    }
  };

  const toggleLyrics = async () => {
    const next = !lyricsOpen;
    setLyricsOpen(next);
    if (next && lyricsText == null && !lyricsLoading) await fetchLyrics();
    if (!next) {
      setPanLocked(false);
      mainScrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  };

  useEffect(() => {
    setLyricsOpen(false);
    setLyricsText(null);
    setLyricsError(null);
    setLyricsLoading(false);
    setPanLocked(false);
  }, [currentSong?.id]);

  // metadatos
  const artistId =
    first((currentSong as any)?.artistId, (currentSong as any)?.artist_id, (currentSong as any)?.artists?.[0]?.id) || null;
  const artistName =
    first(
      (currentSong as any)?.artistName,
      (currentSong as any)?.artist,
      Array.isArray((currentSong as any)?.artists)
        ? (currentSong as any)?.artists.map((a: any) => a?.name).filter(Boolean).join(", ")
        : null
    ) || "";
  const rawThumb =
    first(
      (currentSong as any)?.thumbnail,
      (currentSong as any)?.thumbnail_url,
      (currentSong as any)?.albumCover,
      (currentSong as any)?.thumbnails?.[0]?.url
    ) || "";

  const thumbUrl = upgradeYtmImage(rawThumb, 256) || rawThumb;
  const coverUrl = upgradeYtmImage(rawThumb, 600) || rawThumb;
  const bgUrl = upgradeYtmImage(rawThumb, 1200) || rawThumb;

  useEffect(() => {
    (async () => {
      try {
        const mode = await (TrackPlayer as any).getRepeatMode?.();
        setRepeatOne(mode === RepeatMode.Track);
      } catch { }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const id = currentSong?.id ? String(currentSong.id) : null;
      if (!id || !isTrackLiked) {
        const init =
          Boolean((currentSong as any)?.liked) ||
          Boolean((currentSong as any)?.is_liked) ||
          Boolean((currentSong as any)?.extra?.liked);
        if (!cancelled) setIsLiked(init);
        return;
      }
      try {
        const resp = await isTrackLiked(id);
        if (!cancelled) setIsLiked(Boolean(resp?.liked));
      } catch {
        const init =
          Boolean((currentSong as any)?.liked) ||
          Boolean((currentSong as any)?.is_liked) ||
          Boolean((currentSong as any)?.extra?.liked);
        if (!cancelled) setIsLiked(init);
      }
    })();
    return () => { cancelled = true; };
  }, [currentSong?.id, isTrackLiked]);

  const toggleLike = async () => {
    if (!currentSong?.id || liking) return;
    const id = String(currentSong.id);
    const next = !isLiked;
    setIsLiked(next);
    setLiking(true);
    try { if (next) await likeTrack(id); else await unlikeTrack(id); }
    catch (e) { setIsLiked(!next); console.warn("like/unlike failed:", e); }
    finally { setLiking(false); }
  };

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isExpanded ? 0 : SCREEN_HEIGHT,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isExpanded]);

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
    if (!rawThumb) return;
    (async () => {
      try {
        const src = upgradeYtmImage(rawThumb, 512) || rawThumb;
        const theme = await getThemeFromImage(src);
        setGradient(theme.gradient);
      } catch {
        setGradient(["rgba(0,0,0,0.2)", "rgba(0,0,0,0.85)"]);
      }
    })();
  }, [rawThumb]);

  if (!currentSong) return null;

  const hasNext = queueIndex >= 0 && queueIndex < queue.length - 1;
  const hasPrev = queueIndex > 0;
  const clamped = Math.max(0, Math.min(1, progress));

  const formatMillis = (ms: number) => {
    const total = Math.max(0, Math.floor((ms || 0) / 1000));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const goToArtist = (aid?: string | null) => {
    if (!aid || navigatingRef.current) return;
    const match = pathname?.match(/\/artist\/([^/]+)/);
    const currentArtistInPath = match?.[1];
    if (currentArtistInPath && String(currentArtistInPath) === String(aid)) {
      if (isExpanded) setIsExpanded(false);
      return;
    }
    const doNav = () => {
      navigatingRef.current = true;
      if (pathname && pathname.includes("/artist/")) router.replace(`/artist/${aid}`);
      else router.push(`/artist/${aid}`);
      setTimeout(() => { navigatingRef.current = false; }, 250);
    };
    if (isExpanded) {
      setIsExpanded(false);
      InteractionManager.runAfterInteractions(doNav);
    } else {
      doNav();
    }
  };

  const [dragging, setDragging] = useState(false);
  const [localVal, setLocalVal] = useState(0);
  const knobScale = useRef(new Animated.Value(1)).current;
  const lyricsBtnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => { if (!dragging) setLocalVal(clamped); }, [clamped, dragging]);
  const startDrag = () => {
    setDragging(true);
    Animated.spring(knobScale, { toValue: 1.25, useNativeDriver: true, friction: 6 }).start();
  };
  const endDrag = (v: number) => {
    Animated.spring(knobScale, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
    setDragging(false);
    onSeek(v);
  };
  const displayCurrentMs = dragging ? Math.round(localVal * (duration || 0)) : currentTime;

  return (
    <>
      {/* MINI PLAYER */}
      <View style={stylesMini.wrapper}>
        <LinearGradient
          colors={[gradient[0], gradient[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={stylesMini.glassOverlay} />

        <View style={stylesMini.container}>
          <Image source={{ uri: thumbUrl }} style={stylesMini.thumbnail} />

          <View style={stylesMini.info}>
            <Pressable onPress={() => setIsExpanded(true)} hitSlop={6}>
              <Text style={stylesMini.title} numberOfLines={1}>
                {(currentSong as any)?.title ?? ""}
              </Text>
            </Pressable>
            <Pressable onPress={() => goToArtist(artistId || undefined)} style={{ alignSelf: "flex-start" }}>
              <Text style={stylesMini.artist} numberOfLines={1}>{artistName}</Text>
            </Pressable>
          </View>

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
        {...panResponder.panHandlers}
        pointerEvents={isExpanded ? "auto" : "none"}
        style={[stylesExp.container, { transform: [{ translateY: slideAnim }] }]}
      >
        {/* fondo */}
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

        {/* 🔽 CONTENIDO SCROLLEABLE */}
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
          <View style={stylesExp.dragHandleArea} pointerEvents="box-none">
            <View style={stylesExp.dragHandle} />
          </View>

          <View style={stylesExp.topBar}>
            <TouchableOpacity onPress={() => setIsExpanded(false)}>
              <ChevronDown size={28} color="#fff" />
            </TouchableOpacity>

            <Text style={stylesExp.source} numberOfLines={1}>
              {playSource?.type === "playlist" && `Desde playlist: ${playSource.name ?? ""}`}
              {playSource?.type === "album" && `Desde álbum: ${playSource.name ?? ""}`}
              {playSource?.type === "artist" && `Canciones de ${playSource.name ?? ""}`}
            </Text>

            <TouchableOpacity
              onPress={toggleLike}
              disabled={liking}
              style={{ padding: 4, width: 28, alignItems: "center", marginRight: 6 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name={isLiked ? "heart" : "heart-outline"} size={22} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setSelectedTrack(currentSong); setActionsOpen(true); }}
              style={{ padding: 4, width: 28, alignItems: "flex-end" }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={stylesExp.coverCard}>
            <Image source={{ uri: coverUrl }} style={stylesExp.coverImage} resizeMode="cover" />
            <LinearGradient
              pointerEvents="none"
              colors={["rgba(255,255,255,0.06)", "rgba(0,0,0,0)", "rgba(0,0,0,0.35)"]}
              locations={[0, 0.45, 1]}
              style={StyleSheet.absoluteFill}
            />
          </View>

          <View style={stylesExp.meta}>
            <Text style={stylesExp.title} numberOfLines={2}>{(currentSong as any)?.title ?? ""}</Text>
            <Pressable onPress={() => goToArtist(artistId)} style={{ alignSelf: 'center' }}>
              <Text style={stylesExp.artist} numberOfLines={1}>{artistName}</Text>
            </Pressable>
          </View>

          <View style={stylesExp.sliderContainer}>
            <View style={appleStyles.wrap}>
              <View style={appleStyles.track} />
              <View style={[appleStyles.fill, { width: `${localVal * 100}%` }]} />
              <Animated.View
                pointerEvents="none"
                style={[
                  appleStyles.knob,
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
                onValueChange={(v) => setLocalVal(v)}
                onSlidingComplete={endDrag}
                minimumValue={0}
                maximumValue={1}
                minimumTrackTintColor="transparent"
                maximumTrackTintColor="transparent"
                thumbTintColor="transparent"
                style={StyleSheet.absoluteFill}
              />
            </View>

            <View style={stylesExp.timeRow}>
              <Text style={stylesExp.time}>{formatMillis(displayCurrentMs)}</Text>
              <Text style={stylesExp.time}>{formatMillis(duration)}</Text>
            </View>
          </View>

          <View style={stylesExp.controls}>
            <TouchableOpacity><Shuffle color="#fff" size={28} /></TouchableOpacity>

            <TouchableOpacity onPress={hasPrev ? onPrev : undefined} disabled={!hasPrev}>
              <SkipBack color={hasPrev ? "#fff" : "#888"} size={32} />
            </TouchableOpacity>

            <TouchableOpacity onPress={onTogglePlay} style={stylesExp.playButton}>
              {isPlaying ? <Pause color="#fff" size={32} /> : <Play color="#fff" size={32} />}
            </TouchableOpacity>

            <TouchableOpacity onPress={hasNext ? onNext : undefined} disabled={!hasNext}>
              <SkipForward color={hasNext ? "#fff" : "#888"} size={32} />
            </TouchableOpacity>

            <TouchableOpacity onPress={toggleRepeatOne}>
              <View style={stylesExp.repeatWrap}>
                <Repeat size={28} color={repeatOne ? ACCENT : "#fff"} />
                {repeatOne && <Text style={stylesExp.repeatBadge}>1</Text>}
              </View>
            </TouchableOpacity>
          </View>

          {/* Lyrics al estilo Spotify */}
          <View style={stylesExp.lyricsSection}>
            <Pressable
              onPressIn={() => Animated.spring(lyricsBtnScale, { toValue: 0.97, useNativeDriver: true }).start()}
              onPressOut={() => Animated.spring(lyricsBtnScale, { toValue: 1, useNativeDriver: true }).start()}
              onPress={toggleLyrics}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Animated.View style={[stylesExp.lyricsTogglePill, { transform: [{ scale: lyricsBtnScale }] }]}>
                <Ionicons name="document-text-outline" size={18} color="#fff" />
                <Text style={stylesExp.lyricsToggleText}>{lyricsOpen ? "Hide Lyrics" : "Show Lyrics"}</Text>
                <Ionicons name={lyricsOpen ? "chevron-up" : "chevron-down"} size={16} color="#fff" />
              </Animated.View>
            </Pressable>

            {lyricsOpen && (
              <View style={stylesExp.lyricsCard}>
                <View style={{ alignItems: "center", marginBottom: 8 }}>
                  <Text style={stylesExp.lyricsHeader}>Lyrics</Text>
                  <Text style={stylesExp.lyricsTrack} numberOfLines={1}>{(currentSong as any)?.title ?? ""}</Text>
                  <Text style={stylesExp.lyricsArtist} numberOfLines={1}>{artistName}</Text>
                </View>

                <ScrollView
                  nestedScrollEnabled
                  showsVerticalScrollIndicator
                  style={{ maxHeight: 320 }}
                  contentContainerStyle={{ paddingBottom: 8 }}
                  onScrollBeginDrag={() => setPanLocked(true)}
                  onMomentumScrollEnd={() => setPanLocked(false)}
                  onScrollEndDrag={() => setPanLocked(false)}
                  scrollEventThrottle={16}
                >
                  {lyricsLoading && (
                    <View style={stylesExp.lyricsLoadingRow}>
                      <ActivityIndicator size="small" />
                      <Text style={stylesExp.lyricsLoadingText}>Cargando letras…</Text>
                    </View>
                  )}

                  {!lyricsLoading && lyricsError && (
                    <Text style={stylesExp.lyricsError}>{lyricsError}</Text>
                  )}

                  {!lyricsLoading && !lyricsError && !!lyricsText && (
                    <Text style={stylesExp.lyricsText}>{lyricsText}</Text>
                  )}
                </ScrollView>
              </View>
            )}
          </View>
        </ScrollView>
      </Animated.View>

      {/* SHEET acciones */}
      <TrackActionsSheet open={actionsOpen} onOpenChange={setActionsOpen} track={selectedTrack} />
    </>
  );
}

/* ───────── STYLES ───────── */

const stylesMini = StyleSheet.create({
  wrapper: {
    position: "relative",
    marginHorizontal: 10,
    marginBottom: 8,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,15,15,0.35)",
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  thumbnail: { width: 48, height: 48, borderRadius: 10 },
  info: { flex: 1, marginHorizontal: 12 },
  title: { color: "#fff", fontSize: 14, fontWeight: "600" },
  artist: { color: "#ddd", fontSize: 12 },
  iconButton: { paddingHorizontal: 8 },
});

const stylesExp = StyleSheet.create({
  container: {
    position: "absolute",
    zIndex: 9999,
    height: SCREEN_HEIGHT,
    width: "100%",
    backgroundColor: "#000",
  },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  source: { color: "#ccc", fontSize: 12, textAlign: "center", flex: 1, marginHorizontal: 10 },
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
  title: { color: "#fff", fontSize: 22, fontWeight: "bold", textAlign: "center" },
  artist: { color: "#ccc", fontSize: 16 },
  sliderContainer: { width: "94%", marginBottom: 12, justifyContent: "center", alignSelf: "center" },
  timeRow: { flexDirection: "row", justifyContent: "space-between" },
  time: { color: "#ccc", fontSize: 12 },
  controls: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingHorizontal: 20 },
  playButton: { borderRadius: 999, width: 64, height: 64, justifyContent: "center", alignItems: "center" },
  repeatWrap: { position: "relative", width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  repeatBadge: { position: "absolute", bottom: -2, right: -2, fontSize: 10, color: "#fff" },

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
  dragHandle: { width: 44, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.5)" },

  lyricsSection: {
    marginTop: 90,
    marginBottom: 26,
  },

  lyricsTogglePill: {
    alignSelf: "center",
    width: "92%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    shadowColor: "transparent",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
    overflow: "visible",
  },

  lyricsToggleText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  lyricsCard: {
    marginTop: 14,
    borderRadius: 16,
    padding: 14,
    backgroundColor: "rgba(20,20,20,0.9)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  lyricsHeader: { color: "#fff", fontSize: 14, fontWeight: "600" },
  lyricsTrack: { color: "#fff", fontSize: 14, fontWeight: "700" },
  lyricsArtist: { color: "#bbb", fontSize: 13, marginBottom: 6 },
  lyricsText: { color: "#fff", fontSize: 15, lineHeight: 22, textAlign: "center", letterSpacing: 0.2 },
  lyricsLoadingRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  lyricsLoadingText: { color: "#ccc", marginLeft: 8 },
  lyricsError: { color: "#f66", textAlign: "center", paddingVertical: 18 },
});

/* Apple-like progress styles */
const appleStyles = StyleSheet.create({
  wrap: { height: 28, justifyContent: "center" },
  track: { height: 6, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.35)" },
  fill: { position: "absolute", left: 0, height: 6, borderRadius: 12, backgroundColor: "#fff" },
  knob: {
    position: "absolute", width: 14, height: 14, borderRadius: 7, backgroundColor: "#fff",
    top: 7,
    shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
});