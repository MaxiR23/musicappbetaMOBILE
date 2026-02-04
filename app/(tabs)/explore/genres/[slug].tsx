// app/genres/[slug].tsx
import EmptyState from "@/src/components/shared/EmptyState";
import LoadingView from "@/src/components/shared/LoadingView";
import ReleaseCard from "@/src/components/shared/ReleaseCard";
import ScreenHeader from "@/src/components/shared/ScreenHeader";
import TabBar, { Tab } from "@/src/components/shared/TabBar";
import { useMounted } from "@/src/hooks/use-mounted";
import { useMusicApi } from "@/src/hooks/use-music-api";
import { upgradeThumbUrl } from "@/src/utils/image-helpers";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StatusBar, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function GenrePlaylistsScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { getGenrePlaylists, getGenreCategories } = useMusicApi();
  const insets = useSafeAreaInsets();
  const isMounted = useMounted();

  const [genre, setGenre] = useState<any>(null);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!slug) return;

      try {
        const result = await getGenreCategories(slug);

        if (isMounted() && result?.ok) {
          const cats = result.categories || [];
          setCategories(cats);

          if (cats.length > 0) {
            setActiveCategory(cats[0]);
          }
        }
      } catch (err) {
        console.error("[genres] Error cargando categorías:", err);
        if (isMounted()) {
          setError("Error al cargar categorías");
        }
      }
    })();
  }, [slug, getGenreCategories, isMounted]);

  useEffect(() => {
    (async () => {
      if (!slug) return;

      if (playlists.length === 0) {
        setInitialLoading(true);
      }
      setError(null);

      try {
        const result = await getGenrePlaylists(
          slug,
          activeCategory || undefined
        );

        if (isMounted()) {
          if (result?.ok) {
            setGenre(result.genre);
            setPlaylists(result.playlists || []);
          } else {
            console.error("[genres] API retornó ok=false:", result);
            setError(result?.error || "Error al cargar playlists");
          }
        }
      } catch (err) {
        console.error("[genres] Error cargando playlists:", err);
        if (isMounted()) {
          setError("Error al cargar playlists");
        }
      } finally {
        if (isMounted()) {
          setInitialLoading(false);
        }
      }
    })();
  }, [slug, activeCategory, getGenrePlaylists, isMounted, playlists.length]);

  const tabs = useMemo<Tab[]>(
    () => categories.map((cat) => ({ id: cat, label: cat })),
    [categories]
  );

  const handleRetry = useCallback(() => {
    setError(null);
    setInitialLoading(true);
    setActiveCategory((prev) => prev);
  }, []);

  const renderCard = useCallback(
    ({ item }: { item: any }) => {
      const subtitle = `${item.track_count || 0} canciones`;
      
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
    [router]
  );

  const keyExtractor = useCallback(
    (item: any) => item.id?.toString() || Math.random().toString(),
    []
  );

  const headerTitle = genre?.name || (initialLoading ? "Cargando..." : "Género");

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
          <LoadingView message="Cargando playlists..." />
        ) : error ? (
          <EmptyState
            icon="alert-circle-outline"
            message={error}
            actionLabel="Reintentar"
            onAction={handleRetry}
          />
        ) : playlists.length === 0 ? (
          <EmptyState
            icon="musical-notes-outline"
            message="No hay playlists disponibles"
            submessage={
              activeCategory
                ? `en la categoría "${activeCategory}"`
                : "en este género"
            }
          />
        ) : (
          <FlatList
            data={playlists}
            keyExtractor={keyExtractor}
            numColumns={2}
            columnWrapperStyle={{ gap: 12, justifyContent: "space-between" }}
            contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 24 }}
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