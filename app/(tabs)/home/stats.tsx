import TrackCard from "@/components/shared/TrackCard";
import { useContentPadding } from "@/hooks/use-content-padding";
import { useMusic } from "@/hooks/use-music";
import { useMusicApi } from "@/hooks/use-music-api";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_W } = Dimensions.get("window");
const ARTIST_CARD_W = SCREEN_W * 0.58;
const ARTIST_CARD_H = SCREEN_W * 0.75;
const ALBUM_CARD_W = SCREEN_W * 0.52;

type StatItem = {
  entity_id: string;
  display_name?: string;
  thumbnail_url?: string;
  play_count: number;
  artist_name?: string;
  artist_id?: string;
  album_id?: string;
  album_name?: string;
  duration_seconds?: number;
};

type StatsData = {
  artists: StatItem[];
  albums: StatItem[];
  tracks: StatItem[];
};

function ArtistCard({ item, index, onPress, playLabel }: { item: StatItem; index: number; onPress?: () => void; playLabel: string }) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.artistCard, { width: ARTIST_CARD_W, height: ARTIST_CARD_H }]}
    >
      {item.thumbnail_url ? (
        <Image
          source={item.thumbnail_url}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
        />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "#2a2a2a" }]} />
      )}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.75)"]}
        style={styles.artistCardGradient}
      />
      <Text style={styles.artistCardRank}>{index + 1}</Text>
      <View style={styles.artistCardInfo}>
        <Text style={styles.artistCardName} numberOfLines={1}>
          {item.display_name ?? "—"}
        </Text>
        <Text style={styles.artistCardPlays}>
          {playLabel}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function AlbumCard({ item, index, onPress, playLabel }: { item: StatItem; index: number; onPress?: () => void; playLabel: string }) {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={{ width: ALBUM_CARD_W }}>
      <View style={[styles.albumCover, { width: ALBUM_CARD_W, height: ALBUM_CARD_W }]}>
        {item.thumbnail_url ? (
          <Image
            source={item.thumbnail_url}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        ) : (
          <View style={{ flex: 1, backgroundColor: "#2a2a2a" }} />
        )}
        <Text style={styles.albumRank}>{index + 1}</Text>
      </View>
      <Text style={styles.albumName} numberOfLines={1}>
        {item.display_name ?? "—"}
      </Text>
      {!!item.artist_name && (
        <Text style={styles.albumArtist} numberOfLines={1}>
          {item.artist_name}
        </Text>
      )}
      <Text style={styles.albumPlays}>
        {playLabel}
      </Text>
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export default function MonthlyStatsScreen() {
  const { getMonthlyStats } = useMusicApi();
  const { playList } = useMusic();
  const router = useRouter();
  const contentPadding = useContentPadding();
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation("stats");

  useEffect(() => {
    getMonthlyStats({ include: "artists,albums,tracks" })
      .then((res: any) => {
        setData({
          artists: res?.artists ?? [],
          albums: res?.albums ?? [],
          tracks: res?.tracks ?? [],
        });
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  const hasAnyData = data && (
    data.artists.length > 0 || data.albums.length > 0 || data.tracks.length > 0
  );

  const trackChunks = useMemo(() => {
    return data?.tracks ? chunkArray(data.tracks, 4) : [];
  }, [data?.tracks]);

  const mappedTracks = useMemo(() => {
    if (!data?.tracks) return [];
    return data.tracks.map((track) => ({
      id: track.entity_id,
      title: track.display_name ?? "",
      artist_name: track.artist_name ?? "",
      artist_id: track.artist_id,
      album_id: track.album_id,
      album_name: track.album_name,
      thumbnail: track.thumbnail_url,
      thumbnail_url: track.thumbnail_url,
      duration_seconds: track.duration_seconds,
    }));
  }, [data?.tracks]);

  return (
    <>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <SafeAreaView edges={["top"]} style={{ backgroundColor: "#000" }}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>{t("header.title")}</Text>
              <Text style={styles.headerSub}>{t("header.subtitle")}</Text>
            </View>
          </View>
        </SafeAreaView>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : !hasAnyData ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>{t("empty")}</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: contentPadding.paddingBottom }}
          >
            {!!data!.artists.length && (
              <View style={styles.section}>
                <SectionHeader title={t("sections.topArtists")} />
                <FlatList
                  horizontal
                  data={data!.artists}
                  keyExtractor={(it) => `a-${it.entity_id}`}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
                  renderItem={({ item, index }) => (
                    <ArtistCard
                      item={item}
                      index={index}
                      onPress={() => router.push(`/(tabs)/home/artist/${item.entity_id}`)}
                      playLabel={t("playCount", { count: item.play_count })}
                    />
                  )}
                />
              </View>
            )}

            {!!data!.tracks.length && (
              <View style={styles.section}>
                <SectionHeader title={t("sections.topTracks")} />
                <FlatList
                  horizontal
                  data={trackChunks}
                  keyExtractor={(_, idx) => `chunk-${idx}`}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
                  renderItem={({ item: chunk, index: chunkIndex }) => (
                    <View style={{ gap: 8 }}>
                      {chunk.map((item, idx) => {
                        const globalIndex = chunkIndex * 4 + idx;
                        return (
                          <TrackCard
                            key={item.entity_id}
                            title={item.display_name ?? "—"}
                            artist={item.artist_name}
                            thumbnail={item.thumbnail_url}
                            rank={globalIndex + 1}
                            subtitle={t("playCount", { count: item.play_count })}
                            track={item}
                            trackId={item.entity_id}
                            onPress={() => playList(mappedTracks, globalIndex, { type: "queue", name: t("queueName") })}
                          />
                        );
                      })}
                    </View>
                  )}
                />
              </View>
            )}

            {!!data!.albums.length && (
              <View style={styles.section}>
                <SectionHeader title={t("sections.topAlbums")} />
                <FlatList
                  horizontal
                  data={data!.albums}
                  keyExtractor={(it) => `al-${it.entity_id}`}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}
                  renderItem={({ item, index }) => (
                    <AlbumCard
                      item={item}
                      index={index}
                      onPress={() => router.push(`/(tabs)/home/album/${item.entity_id}`)}
                      playLabel={t("playCount", { count: item.play_count })}
                    />
                  )}
                />
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  headerSub: {
    color: "#666",
    fontSize: 13,
    marginTop: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: "#555",
    fontSize: 15,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionHeaderText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  artistCard: {
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#1a1a1a",
  },
  artistCardGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "50%",
  },
  artistCardRank: {
    position: "absolute",
    bottom: 52,
    left: 14,
    color: "#fff",
    fontSize: 52,
    fontWeight: "800",
    opacity: 0.95,
  },
  artistCardInfo: {
    position: "absolute",
    bottom: 12,
    left: 14,
    right: 14,
  },
  artistCardName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  artistCardPlays: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    marginTop: 2,
  },
  albumCover: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#1a1a1a",
  },
  albumRank: {
    position: "absolute",
    bottom: 8,
    left: 10,
    color: "#fff",
    fontSize: 36,
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  albumName: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 8,
  },
  albumArtist: {
    color: "#888",
    fontSize: 12,
    marginTop: 2,
  },
  albumPlays: {
    color: "#666",
    fontSize: 11,
    marginTop: 2,
  },
});