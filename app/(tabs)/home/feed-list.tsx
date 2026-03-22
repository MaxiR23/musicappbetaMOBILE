import ReleaseCard from "@/components/shared/ReleaseCard";
import ScreenHeader from "@/components/shared/ScreenHeader";
import { ReleaseGridSkeletonLayout } from "@/components/shared/skeletons/Skeleton";
import { useContentPadding } from "@/hooks/use-content-padding";
import { useMusicApi } from "@/hooks/use-music-api";
import { fetchFeed } from "@/services/feedService";
import { fetchRecommendations } from "@/services/recommendService";
import { getUpgradedThumb } from "@/utils/image-helpers";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const FEED_CONFIG: Record<string, { kind: string; type: "album" | "track" }> = {
  "new-releases": { kind: "new_releases", type: "album" },
  "top-albums": { kind: "most_played", type: "album" },
  "top-tracks": { kind: "most_played", type: "track" },
  "new-singles": { kind: "new_singles", type: "track" },
  "seed-tracks": { kind: "seed_tracks", type: "track" },
};

export default function FeedListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const contentPadding = useContentPadding();
  const { getRecentPlays, getThisMonthReleases } = useMusicApi();

  const { key, title } = useLocalSearchParams<{ key: string; title: string }>();

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!key) return;

    (async () => {
      setLoading(true);
      try {
        if (key === "recents") {
          const resp = await getRecentPlays(30);
          setItems(resp?.items ?? []);
        } else if (key === "reco-albums") {
          const resp = await fetchRecommendations();
          setItems(resp?.albums ?? []);
        } else if (key === "this-month-releases") {
          const resp = await getThisMonthReleases();
          const mapped = (resp?.releases ?? []).map((r) => ({
            id: r.artist_id,
            title: r.album,
            artist: r.artist,
            thumbnail_url: r.thumbnail,
            release_date: r.release_date,
          }));
          setItems(mapped);
        } else {
          const config = FEED_CONFIG[key];
          if (config) {
            const data = await fetchFeed({ kind: config.kind, type: config.type, limit: 50 });
            setItems(data);
          }
        }
      } catch (e) {
        console.warn("[FeedList] error:", e);
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [key, getRecentPlays, getThisMonthReleases]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <ScreenHeader title={title || "Feed"} />

      {loading ? (
        <ReleaseGridSkeletonLayout count={6} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, idx) => `${item.id}-${idx}`}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, justifyContent: "space-between" }}
          contentContainerStyle={[{ padding: 12, gap: 12 }, contentPadding]}
          renderItem={({ item }) => {
            const isArtist = item.type === "artist";
            const cover = getUpgradedThumb(item, 512) || item.thumbnail_url;

            return (
              <ReleaseCard
                cover={cover}
                title={item.title || item.name}
                subtitle={item.artist || item.artist_name || (isArtist ? "Artista" : "Álbum")}
                circular={isArtist}
                onPress={() =>
                  router.push(
                    isArtist
                      ? `/(tabs)/home/artist/${item.id}`
                      : `/(tabs)/home/album/${item.id}`
                  )
                }
              />
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0e0e0e" },
});