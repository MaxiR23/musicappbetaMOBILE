import ReleaseCard from "@/src/components/shared/ReleaseCard";
import ScreenHeader from "@/src/components/shared/ScreenHeader";
import { ReleaseGridSkeletonLayout } from "@/src/components/shared/skeletons/Skeleton";
import TabBar, { Tab } from "@/src/components/shared/TabBar";
import { useContentPadding } from "@/src/hooks/use-content-padding";
import { useMounted } from "@/src/hooks/use-mounted";
import { useMusicApi } from "@/src/hooks/use-music-api";
import { usePaginatedData } from "@/src/hooks/use-paginated-data";
import { getUpgradedThumb } from "@/src/utils/image-helpers";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StatusBar, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type TabKey = "albums" | "singles";

const ITEMS_PER_PAGE = 20;

const TABS: Tab[] = [
  { id: "albums", label: "Albums" },
  { id: "singles", label: "Singles & EPs" },
];

export default function ArtistReleasesScreen() {
  const router = useRouter();
  const { id, tab, name } = useLocalSearchParams<{
    id: string;
    tab?: TabKey;
    name?: string;
  }>();

  const contentPadding = useContentPadding();

  const initialTab: TabKey = tab === "singles" ? "singles" : "albums";
  const artistId = String(id);
  const artistName = typeof name === "string" ? name : undefined;

  const { getArtistAlbums, getArtistSingles } = useMusicApi();
  const insets = useSafeAreaInsets();
  const isMounted = useMounted();

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [albums, setAlbums] = useState<any[] | null>(null);
  const [singles, setSingles] = useState<any[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      if (!artistId) return;
      setLoading(true);
      try {
        if (activeTab === "albums") {
          if (!albums) {
            const res = await getArtistAlbums(artistId);
            if (isMounted()) setAlbums(res.albums || []);
          }
        } else {
          if (!singles) {
            const res = await getArtistSingles(artistId);
            if (isMounted()) setSingles(res.singles || []);
          }
        }
      } finally {
        if (isMounted()) setLoading(false);
      }
    })();
  }, [activeTab, artistId, albums, singles, getArtistAlbums, getArtistSingles, isMounted]);

  const allData = useMemo(
    () => (activeTab === "albums" ? albums : singles) || [],
    [activeTab, albums, singles]
  );

  const { visibleData, loadMore } = usePaginatedData({
    data: allData,
    itemsPerPage: ITEMS_PER_PAGE,
  });

  const renderCard = useCallback(
    ({ item }: { item: any }) => {
      const cover = getUpgradedThumb(item, 512);
      const subtitle =
        activeTab === "albums"
          ? `Album${item.year ? ` • ${item.year}` : ""}`
          : `${item.type ?? "Single"}${item.year ? ` • ${item.year}` : ""}`;

      return (
        <ReleaseCard
          cover={cover}
          title={item.title}
          subtitle={subtitle}
          onPress={() => router.push(`/(tabs)/home/album/${item.id}`)}
        />
      );
    },
    [activeTab, router]
  );

  const keyExtractor = useCallback(
    (item: any, idx: number) => `${activeTab}-${item.id}-${idx}`,
    [activeTab]
  );

  return (
    <>
      <StatusBar barStyle="light-content" />
      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
        <ScreenHeader title={artistName || "Artist"} />

        <TabBar
          tabs={TABS}
          activeTabId={activeTab}
          onTabChange={(id) => setActiveTab(id as TabKey)}
          scrollable={false}
        />

        {loading && visibleData.length === 0 ? (
          <ReleaseGridSkeletonLayout count={6} />
        ) : (
          <FlatList
            data={visibleData}
            keyExtractor={keyExtractor}
            numColumns={2}
            columnWrapperStyle={{ gap: 12, justifyContent: "space-between" }}
            contentContainerStyle={[
              { padding: 12, gap: 12 }, 
              contentPadding
            ]}
            renderItem={renderCard}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            removeClippedSubviews={true}
            initialNumToRender={20}
            maxToRenderPerBatch={10}
            windowSize={5}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0e0e0e",
  },
});