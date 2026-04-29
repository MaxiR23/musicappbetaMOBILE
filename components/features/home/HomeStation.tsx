import BeatlyLogo from "@/components/shared/BeatlyLogo";
import { useImageDominantColor } from "@/hooks/use-image-dominant-color";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useSegments } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { StationCard as StationCardType } from "@/services/musicService";
import { upgradeThumbUrl } from "@/utils/image-helpers";

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_W * 0.6;
const CARD_HEIGHT = CARD_WIDTH;

function StationCard({ station }: { station: StationCardType }) {
  const { t } = useTranslation("home");
  const router = useRouter();
  const segments = useSegments();
  const tab = segments[1] ?? "home";

  const thumbUrl = upgradeThumbUrl(station.thumbnail ?? undefined, 1024);
  const { color: dominantColor, isLight: colorIsLight } = useImageDominantColor(thumbUrl ?? null);
  //DBG: console.log("[StationCard]", { dominantColor, colorIsLight, thumbUrl });
  const logoColor = colorIsLight ? "#000" : "#fff";

  const handlePress = () => {
    router.push({
      pathname: `/(tabs)/${tab}/station/[artistId]` as any,
      params: {
        artistId: station.artist_id,
        name: station.name ?? "",
        thumb: station.thumbnail ?? "",
      },
    });
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      style={styles.card}
    >
      {thumbUrl ? (
        <Image
          source={thumbUrl}
          style={styles.image}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.image, styles.fallback]} />
      )}

      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.85)"]}
        style={styles.gradient}
        pointerEvents="none"
      />

      <View style={styles.logoWrap} pointerEvents="none">
        <BeatlyLogo size={20} color={logoColor} />
      </View>

      <View style={styles.footer} pointerEvents="none">
        <Text style={styles.label}>
          {t("sections.stations.basedOn", { defaultValue: "Station based on" })}
        </Text>
        <Text style={styles.artistName} numberOfLines={1}>
          {station.name ?? ""}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

type HomeStationsProps = {
  stations: StationCardType[];
  title?: string;
};

export default function HomeStations({ stations, title }: HomeStationsProps) {
  if (!stations?.length) return null;

  return (
    <View style={styles.section}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {stations.map((s) => (
          <StationCard key={s.artist_id} station={s} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 12,
  },
  scroll: { paddingHorizontal: 10, gap: 12 },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#1a1a1a",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  fallback: {
    backgroundColor: "#333",
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "50%",
  },
  logoWrap: {
    position: "absolute",
    top: 12,
    right: 12,
  },
  footer: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 12,
  },
  label: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  artistName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    paddingHorizontal: 8,
    marginBottom: 10,
  },
});