import EmptyState from "@/components/shared/EmptyState";
import LoadingView from "@/components/shared/LoadingView";
import ReleaseCard from "@/components/shared/ReleaseCard";
import ScreenHeader from "@/components/shared/ScreenHeader";
import TabBar, { Tab } from "@/components/shared/TabBar";
import { useContentPadding } from "@/hooks/use-content-padding";
import { useMusicApi } from "@/hooks/use-music-api";
import { upgradeThumbUrl } from "@/utils/image-helpers";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, StatusBar, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function GenrePlaylistsScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { getGenrePlaylists, getGenreCategories } = useMusicApi();
  const insets = useSafeAreaInsets();
  const contentPadding = useContentPadding();
  const { t } = useTranslation("explore");

  const getGenreCategoriesRef = useRef(getGenreCategories);
  getGenreCategoriesRef.current = getGenreCategories;
  const getGenrePlaylistsRef = useRef(getGenrePlaylists);
  getGenrePlaylistsRef.current = getGenrePlaylists;

  const [genre, setGenre] = useState<any>(null);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // -- Effect 1: Cargar categorias (solo cuando cambia slug o retry) --
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    setCategoriesLoaded(false);

    (async () => {
      try {
        const result = await getGenreCategoriesRef.current(slug);
        if (cancelled) return;

        if (result?.ok) {
          const cats = result.categories || [];
          setCategories(cats);
          if (cats.length > 0) {
            setActiveCategory(cats[0]);
          }
        } else {
          setError(t("genres.playlists.errorCategories"));
          setInitialLoading(false);
        }
      } catch (err) {
        console.error("[genres] Error cargando categorias:", err);
        if (!cancelled) {
          setError(t("genres.playlists.errorCategories"));
          setInitialLoading(false);
        }
      } finally {
        if (!cancelled) {
          setCategoriesLoaded(true);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [slug, retryCount, t]);

  // -- Effect 2: Cargar playlists (cuando categorias terminaron de cargar o cambia tab) --
  useEffect(() => {
    if (!slug || !categoriesLoaded) return;
    let cancelled = false;

    setError(null);
    if (!genre) {
      setInitialLoading(true);
    }

    (async () => {
      try {
        const result = await getGenrePlaylistsRef.current(
          slug,
          activeCategory || undefined
        );
        if (cancelled) return;

        if (result?.ok) {
          setGenre(result.genre);
          setPlaylists(result.playlists || []);
        } else {
          setError(t("genres.playlists.errorPlaylists"));
        }
      } catch (err) {
        console.error("[genres] Error cargando playlists:", err);
        if (!cancelled) {
          setError(t("genres.playlists.errorPlaylists"));
        }
      } finally {
        if (!cancelled) {
          setInitialLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [slug, activeCategory, categoriesLoaded, retryCount, t]);

  const tabs = useMemo<Tab[]>(
    () => categories.map((cat) => ({ id: cat, label: cat })),
    [categories]
  );

  const handleRetry = useCallback(() => {
    setError(null);
    setInitialLoading(true);
    setPlaylists([]);
    setCategories([]);
    setActiveCategory(null);
    setCategoriesLoaded(false);
    setGenre(null);
    setRetryCount((c) => c + 1);
  }, []);

  const renderCard = useCallback(
    ({ item }: { item: any }) => {
      const count = item.track_count || 0;
      const subtitle = t("genres.playlists.trackCount", { count });

      const thumbnails = (item.thumbnails || [])
        .map((url: string) => upgradeThumbUrl(url, 512) || url)
        .filter(Boolean);

      return (
        <ReleaseCard
          thumbnails={thumbnails.length > 0 ? thumbnails : undefined}
          cover={null}
          title={item.title}
          subtitle={subtitle}
          onPress={() => router.push(`/(tabs)/explore/genre-playlist/${item.id}`)}
        />
      );
    },
    [router, t]
  );

  const keyExtractor = useCallback(
    (item: any) => item.id?.toString() || Math.random().toString(),
    []
  );

  const headerTitle = genre?.name
    || (initialLoading ? t("genres.playlists.loading") : t("genres.playlists.fallbackTitle"));

  return (
    <>
      <StatusBar barStyle="light-content" />
      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
        <ScreenHeader title={headerTitle} />

        {tabs.length > 0 && (
          <TabBar
            tabs={tabs}
            activeTabId={activeCategory || ""}
            onTabChange={setActiveCategory}
          />
        )}

        {initialLoading ? (
          <LoadingView message={t("genres.playlists.loadingPlaylists")} />
        ) : error ? (
          <EmptyState
            icon="alert-circle-outline"
            message={error}
            actionLabel={t("genres.playlists.retry")}
            onAction={handleRetry}
          />
        ) : playlists.length === 0 ? (
          <EmptyState
            icon="musical-notes-outline"
            message={t("genres.playlists.emptyTitle")}
            submessage={
              activeCategory
                ? t("genres.playlists.emptyWithCategory", { category: activeCategory })
                : t("genres.playlists.emptyWithoutCategory")
            }
          />
        ) : (
          <FlatList
            data={playlists}
            keyExtractor={keyExtractor}
            numColumns={2}
            columnWrapperStyle={{ gap: 12, justifyContent: "space-between" }}
            contentContainerStyle={[
              { padding: 12, gap: 12 },
              contentPadding
            ]}
            renderItem={renderCard}
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