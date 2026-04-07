import { useMusicApi } from "@/hooks/use-music-api";
import { useReplay } from "@/hooks/use-replay";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

// -- Replay weekly palettes --
// Cada viernes rota a la siguiente. Todas testeadas con texto blanco.
// base: gradiente inicial (visible durante el fade-in del overlay)
// overlay: gradiente final (aparece con la animacion)
const REPLAY_PALETTES = [
  { base: ["#008c6a", "#009e8e", "#006b5b"], overlay: ["#00b894", "#00cec9", "#007a6e"] },   // esmeralda
  { base: ["#6c3483", "#8e44ad", "#512e5f"], overlay: ["#a569bd", "#c39bd3", "#7d3c98"] },   // violeta
  { base: ["#1a5276", "#2980b9", "#154360"], overlay: ["#3498db", "#5dade2", "#2471a3"] },   // oceano
  { base: ["#b9770e", "#d4ac0d", "#7d6608"], overlay: ["#f1c40f", "#f4d03f", "#d4ac0d"] },   // ambar
  { base: ["#8e3a5e", "#c2185b", "#6a1b4d"], overlay: ["#e91e63", "#f06292", "#ad1457"] },   // rosa
  { base: ["#0e6655", "#148f77", "#0b5345"], overlay: ["#1abc9c", "#48c9b0", "#17a589"] },   // teal
  { base: ["#b84e2a", "#d35400", "#a04000"], overlay: ["#e67e22", "#f0b27a", "#d35400"] },   // coral
  { base: ["#283593", "#3949ab", "#1a237e"], overlay: ["#5c6bc0", "#7986cb", "#3f51b5"] },   // indigo
] as const;

function getWeeklyPalette() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return REPLAY_PALETTES[week % REPLAY_PALETTES.length];
}

// -- Cards --
function StatsCard() {
  const { t } = useTranslation("home");
  const router = useRouter();
  const { getMonthlyStats } = useMusicApi();
  const [artists, setArtists] = useState<any[]>([]);

  useEffect(() => {
    getMonthlyStats({ include: "artists", limit: 3 })
      .then((data) => setArtists(data?.artists ?? []))
      .catch(() => { });
  }, [getMonthlyStats]);

  if (!artists.length) return null;

  const artistNames = artists
    .map((a) => a?.display_name ?? a?.name ?? "")
    .filter(Boolean)
    .join(", ");

  const thumb = (a: any) => a?.thumbnail_url ?? a?.thumbnail ?? null;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => router.push("/(tabs)/home/stats")}
      style={styles.card}
    >
      <LinearGradient
        colors={["#2a2a3e", "#1a1a2e", "#111120"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        <View style={[styles.circle, styles.circleLarge, { top: 6, left: 8 }]}>
          {thumb(artists[0]) && (
            <Image source={thumb(artists[0])} style={styles.circleLargeImg} />
          )}
        </View>
        <View style={[styles.circle, styles.circleMedium, { top: 84, right: 16 }]}>
          {thumb(artists[1]) && (
            <Image source={thumb(artists[1])} style={styles.circleMediumImg} />
          )}
        </View>
        <View style={[styles.circle, styles.circleSmall, { top: 132, left: 40 }]}>
          {thumb(artists[2]) && (
            <Image source={thumb(artists[2])} style={styles.circleSmallImg} />
          )}
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.cardSubtitle} numberOfLines={2}>{artistNames}</Text>
          <Text style={styles.cardTitle}>{t("sections.featured.statsTitle")}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function ReplayCard() {
  const { t } = useTranslation("home");
  const router = useRouter();
  const { songs, loading, hasEnoughData } = useReplay();
  const overlay = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const palette = getWeeklyPalette();

  useEffect(() => {
    overlay.value = withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) });
    textOpacity.value = withTiming(1, { duration: 1200, easing: Easing.out(Easing.ease) });
  }, []);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlay.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  if (loading || !hasEnoughData) return null;

  const topSongs = songs.slice(0, 5);
  const trackNames = topSongs
    .map((s) => s.title ?? "")
    .filter(Boolean)
    .join(", ");

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => router.push("/(tabs)/home/replay")}
      style={styles.card}
    >
      <LinearGradient
        colors={[...palette.base]}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[StyleSheet.absoluteFill, overlayStyle]}>
        <LinearGradient
          colors={[...palette.overlay]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View style={[styles.cardGradient, textStyle]}>
        <View style={styles.replayContent}>
          <Text style={styles.replayLabel}>Replay</Text>
          <Text style={styles.replayTitle}>Mix</Text>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {t("sections.featured.replaySubtitle")}
          </Text>
          <Text style={styles.replayTrackNames} numberOfLines={2}>
            {trackNames}
          </Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

function ListenAgainCard() {
  const { t } = useTranslation("home");
  const router = useRouter();
  const { getListenAgain } = useMusicApi();
  const [album, setAlbum] = useState<any>(null);

  useEffect(() => {
    getListenAgain()
      .then((data) => setAlbum(data?.album ?? null))
      .catch(() => { });
  }, [getListenAgain]);

  if (!album) return null;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => router.push(`/(tabs)/home/album/${encodeURIComponent(album.album_id)}`)}
      style={styles.card}
    >
      <View style={StyleSheet.absoluteFill}>
        {album.thumbnail_url ? (
          <Image
            source={album.thumbnail_url}
            style={styles.listenAgainCover}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.listenAgainCover, { backgroundColor: "#2a2a2a" }]} />
        )}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.85)"]}
          style={styles.listenAgainGradient}
        />
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.listenAgainLabel}>{t("sections.featured.listenAgainLabel")}</Text>
        <Text style={styles.listenAgainTitle} numberOfLines={2}>
          {album.album_name}
        </Text>
        <Text style={styles.cardSubtitle} numberOfLines={1}>
          {album.artist_name}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeFeatured() {
  const { songs, loading, hasEnoughData } = useReplay();
  const { getMonthlyStats } = useMusicApi();
  const [hasStats, setHasStats] = useState(false);

  useEffect(() => {
    getMonthlyStats({ include: "artists", limit: 1 })
      .then((data) => setHasStats((data?.artists ?? []).length > 0))
      .catch(() => { });
  }, [getMonthlyStats]);

  const showReplay = !loading && hasEnoughData;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
      style={styles.container}
    >
      {hasStats && <StatsCard />}
      {showReplay && <ReplayCard />}
      <ListenAgainCard />
    </ScrollView>
  );
}

const CARD_WIDTH = 175;
const CARD_HEIGHT = 280;

const styles = StyleSheet.create({
  container: { marginVertical: 12 },
  scroll: { paddingHorizontal: 10, gap: 12 },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 18,
    overflow: "hidden",
  },
  cardGradient: {
    flex: 1,
    padding: 14,
  },
  circle: {
    position: "absolute",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#333",
  },
  circleLarge: { width: 100, height: 100, borderRadius: 50 },
  circleLargeImg: { width: 100, height: 100, borderRadius: 50 },
  circleMedium: { width: 72, height: 72, borderRadius: 36 },
  circleMediumImg: { width: 72, height: 72, borderRadius: 36 },
  circleSmall: { width: 58, height: 58, borderRadius: 29 },
  circleSmallImg: { width: 58, height: 58, borderRadius: 29 },
  cardFooter: {
    position: "absolute",
    bottom: 14,
    left: 14,
    right: 14,
    gap: 2,
  },
  cardSubtitle: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 10,
    fontWeight: "500",
  },
  cardTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 20,
  },
  replayContent: {
    flex: 1,
    justifyContent: "center",
  },
  replayLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "600",
  },
  replayTitle: {
    color: "#fff",
    fontSize: 42,
    fontWeight: "800",
    lineHeight: 36,
  },
  replayTrackNames: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10,
    fontWeight: "400",
  },
  listenAgainCover: {
    width: "100%",
    height: "100%",
  },
  listenAgainGradient: {
    position: "absolute",
    bottom: -1,
    left: 0,
    right: 0,
    height: "55%",
  },
  listenAgainLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  listenAgainTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 18,
  },
});