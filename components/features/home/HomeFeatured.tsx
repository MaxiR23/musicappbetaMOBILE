import { useMusicApi } from "@/hooks/use-music-api";
import { MappedSong } from "@/utils/song-mapper";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import DynamicCoverCard from "@/components/shared/DynamicCoverCard";
import { useImageDominantColor } from "@/hooks/use-image-dominant-color";

// -- Replay weekly palettes --
const REPLAY_PALETTES = [
  { base: ["#008c6a", "#009e8e", "#006b5b"], overlay: ["#00b894", "#00cec9", "#007a6e"] },
  { base: ["#6c3483", "#8e44ad", "#512e5f"], overlay: ["#a569bd", "#c39bd3", "#7d3c98"] },
  { base: ["#1a5276", "#2980b9", "#154360"], overlay: ["#3498db", "#5dade2", "#2471a3"] },
  { base: ["#b9770e", "#d4ac0d", "#7d6608"], overlay: ["#f1c40f", "#f4d03f", "#d4ac0d"] },
  { base: ["#8e3a5e", "#c2185b", "#6a1b4d"], overlay: ["#e91e63", "#f06292", "#ad1457"] },
  { base: ["#0e6655", "#148f77", "#0b5345"], overlay: ["#1abc9c", "#48c9b0", "#17a589"] },
  { base: ["#b84e2a", "#d35400", "#a04000"], overlay: ["#e67e22", "#f0b27a", "#d35400"] },
  { base: ["#283593", "#3949ab", "#1a237e"], overlay: ["#5c6bc0", "#7986cb", "#3f51b5"] },
] as const;

function getWeeklyPalette() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return REPLAY_PALETTES[week % REPLAY_PALETTES.length];
}

// -- Layout constants --
const { width: SCREEN_W } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_W * 0.49;
const CARD_HEIGHT = CARD_WIDTH * 1.46;

const CIRCLE_LG = CARD_WIDTH * 0.52;
const CIRCLE_MD = CARD_WIDTH * 0.42;
const CIRCLE_SM = CARD_WIDTH * 0.33;

// -- Cards --
function StatsCard() {
  const { t } = useTranslation("home");
  const router = useRouter();
  const { getMonthlyStats } = useMusicApi();
  const [artists, setArtists] = useState<any[]>([]);
  const firstThumb = artists[0] ? (artists[0]?.thumbnail_url ?? artists[0]?.thumbnail ?? null) : null;
  const { color: dominantColor } = useImageDominantColor(firstThumb);

  useEffect(() => {
    getMonthlyStats({ include: "artists", limit: 3 })
      .then((data) => setArtists(data?.artists ?? []))
      .catch(() => {});
  }, [getMonthlyStats]);

  if (!artists.length) return null;

  const artistNames = artists
    .map((a) => a?.display_name ?? a?.name ?? "")
    .filter(Boolean)
    .join(", ");

  const thumb = (a: any) => a?.thumbnail_url ?? a?.thumbnail ?? null;

  const circles = [
    { size: CIRCLE_LG, top: CARD_HEIGHT * 0.03, left: CARD_WIDTH * 0.04 },
    { size: CIRCLE_MD, top: CARD_HEIGHT * 0.33, right: CARD_WIDTH * 0.08 },
    { size: CIRCLE_SM, top: CARD_HEIGHT * 0.55, left: CARD_WIDTH * 0.15 },
  ];

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => router.push("/(tabs)/home/stats")}
      style={styles.card}
    >
      <LinearGradient
        colors={[dominantColor, "#000000"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        {circles.map((c, i) => {
          const radius = c.size / 2;
          return (
            <View
              key={i}
              style={[
                styles.circle,
                {
                  width: c.size,
                  height: c.size,
                  borderRadius: radius,
                  top: c.top,
                  ...(c.left != null ? { left: c.left } : {}),
                  ...(c.right != null ? { right: c.right } : {}),
                },
              ]}
            >
              {thumb(artists[i]) && (
                <Image
                  source={thumb(artists[i])}
                  style={{ width: "100%", height: "100%", borderRadius: radius }}
                />
              )}
            </View>
          );
        })}
        <View style={styles.cardFooter}>
          <Text style={styles.cardSubtitle} numberOfLines={2}>{artistNames}</Text>
          <Text style={styles.cardTitle}>{t("sections.featured.statsTitle")}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function ReplayCard({ songs }: { songs: MappedSong[] }) {
  const { t } = useTranslation("home");
  const router = useRouter();
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

  if (!songs.length) return null;

  const trackNames = songs
    .slice(0, 5)
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

type HomeFeaturedProps = {
  replaySongs: MappedSong[];
  replayLoading: boolean;
  listenAgainAlbum: any;
  featuredRelease: any;
};

export default function HomeFeatured({
  replaySongs,
  replayLoading,
  listenAgainAlbum,
  featuredRelease,
}: HomeFeaturedProps) {
  const { t } = useTranslation("home");
  const router = useRouter();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
      style={styles.container}
    >
      <StatsCard />
      {featuredRelease && (
        <DynamicCoverCard
          thumbnailUrl={featuredRelease.thumbnail_url}
          label={t("sections.featured.newReleaseLabel")}
          title={featuredRelease.album_name}
          subtitle={featuredRelease.artist_name}
          onPress={() =>
            featuredRelease.album_id
              ? router.push(`/(tabs)/home/album/${encodeURIComponent(featuredRelease.album_id)}`)
              : router.push(`/(tabs)/home/artist/${encodeURIComponent(featuredRelease.artist_id)}`)
          }
          width={CARD_WIDTH}
          height={CARD_HEIGHT}
        />
      )}
      {!replayLoading && <ReplayCard songs={replaySongs} />}
      {listenAgainAlbum && (
        <DynamicCoverCard
          thumbnailUrl={listenAgainAlbum.thumbnail_url}
          label={t("sections.featured.listenAgainLabel")}
          title={listenAgainAlbum.album_name}
          subtitle={listenAgainAlbum.artist_name}
          onPress={() => router.push(`/(tabs)/home/album/${encodeURIComponent(listenAgainAlbum.album_id)}`)}
          width={CARD_WIDTH}
          height={CARD_HEIGHT}
        />
      )}
    </ScrollView>
  );
}

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
});