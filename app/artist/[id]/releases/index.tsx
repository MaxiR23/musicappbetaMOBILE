// app/artist/[id]/releases/index.tsx
import ReleaseCard from "@/src/components/shared/ReleaseCard";
import { ReleaseGridSkeletonLayout } from "@/src/components/shared/skeletons/Skeleton";
import { useMusicApi } from "@/src/hooks/use-music-api";
import { getUpgradedThumb } from "@/src/utils/image-helpers";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type TabKey = "albums" | "singles";

const ITEMS_PER_PAGE = 20;

export default function ArtistReleasesScreen() {
  const router = useRouter();
  const { id, tab, name } = useLocalSearchParams<{
    id: string;
    tab?: TabKey;
    name?: string;
  }>();
  const initialTab: TabKey = tab === "singles" ? "singles" : "albums";
  const artistId = String(id);
  const artistName = typeof name === "string" ? name : undefined;

  const { getArtistAlbums, getArtistSingles } = useMusicApi();

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [albums, setAlbums] = useState<any[] | null>(null);
  const [singles, setSingles] = useState<any[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [displayCount, setDisplayCount] = useState<number>(ITEMS_PER_PAGE);

  // padding top seguro (evita solaparse con notificaciones/StatusBar)
  const topPad = (StatusBar.currentHeight ?? 0) + 8;

  // Carga perezosa por tab
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!artistId) return;
      setLoading(true);
      try {
        if (activeTab === "albums") {
          if (!albums) {
            const res = await getArtistAlbums(artistId);
            if (mounted) setAlbums(res.albums || []);
          }
        } else {
          if (!singles) {
            const res = await getArtistSingles(artistId);
            if (mounted) setSingles(res.singles || []);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, artistId]);

  // Reset displayCount cuando cambia el tab
  useEffect(() => {
    setDisplayCount(ITEMS_PER_PAGE);
  }, [activeTab]);

  const allData = useMemo(
    () => (activeTab === "albums" ? albums : singles) || [],
    [activeTab, albums, singles]
  );

  // Data paginada
  const data = useMemo(
    () => allData.slice(0, displayCount),
    [allData, displayCount]
  );

  // Infinite scroll
  const handleEndReached = useCallback(() => {
    if (displayCount < allData.length) {
      setDisplayCount((prev) => Math.min(prev + ITEMS_PER_PAGE, allData.length));
    }
  }, [displayCount, allData.length]);

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
          onPress={() => router.push(`/album/${item.id}`)}
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
      <View style={[styles.container, { paddingTop: topPad }]}>
        {/* Header con back */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerName} numberOfLines={1}>
            {artistName || "Artist"}
          </Text>
          {/* placeholder para balancear el espacio del back */}
          <View style={styles.backBtn} />
        </View>

        {/* Tabs locales */}
        <View style={styles.tabsRow}>
          <Pressable
            onPress={() => setActiveTab("albums")}
            style={[styles.tab, activeTab === "albums" && styles.tabActive]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "albums" && styles.tabTextActive,
              ]}
            >
              Albums
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("singles")}
            style={[styles.tab, activeTab === "singles" && styles.tabActive]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "singles" && styles.tabTextActive,
              ]}
            >
              Singles & EPs
            </Text>
          </Pressable>
        </View>

        {/* Grid */}
        {loading && (!data || data.length === 0) ? (
          <ReleaseGridSkeletonLayout count={6} />
        ) : (
          <FlatList
            data={data}
            keyExtractor={keyExtractor}
            numColumns={2}
            columnWrapperStyle={{ gap: 12, justifyContent: "space-between" }}
            contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 24 }}
            renderItem={renderCard}
            onEndReached={handleEndReached}
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
  container: { flex: 1, backgroundColor: "#0e0e0e" },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerName: {
    flex: 1,
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },

  tabsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 8,
    marginTop: 4,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#1e1e1e",
  },
  tabActive: { backgroundColor: "#fff" },
  tabText: { color: "#ddd", fontWeight: "600" },
  tabTextActive: { color: "#000" },
});