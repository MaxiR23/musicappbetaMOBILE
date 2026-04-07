import GenreCard from "@/components/shared/GenreCard";
import LoadingView from "@/components/shared/LoadingView";
import ScreenHeader from "@/components/shared/ScreenHeader";
import { useContentPadding } from "@/hooks/use-content-padding";
import { useMusicApi } from "@/hooks/use-music-api";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, StatusBar, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Genre {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  created_at: string;
}

export default function GenresScreen() {
  const router = useRouter();
  const { getGenres } = useMusicApi();
  const insets = useSafeAreaInsets();
  const contentPadding = useContentPadding();
  const { t } = useTranslation("explore");

  const getGenresRef = useRef(getGenres);
  getGenresRef.current = getGenres;

  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const result = await getGenresRef.current();
        if (!cancelled && result?.ok && result?.genres) {
          setGenres(result.genres);
        }
      } catch (err) {
        console.warn("[genres] Error cargando generos:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const renderGenre = useCallback(
    ({ item }: { item: Genre }) => (
      <GenreCard
        name={item.name}
        slug={item.slug}
        onPress={() => router.push(`/(tabs)/explore/genres/${encodeURIComponent(item.slug)}`)}
      />
    ),
    [router]
  );

  const keyExtractor = useCallback((item: Genre) => item.id, []);

  return (
    <>
      <StatusBar barStyle="light-content" />
      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
        <ScreenHeader title={t("genres.title")} />

        {loading ? (
          <LoadingView />
        ) : (
          <FlatList
            data={genres}
            keyExtractor={keyExtractor}
            renderItem={renderGenre}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={[styles.listContent, contentPadding]}
            showsVerticalScrollIndicator={false}
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
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 24,
    gap: 12,
  },
  row: {
    gap: 12,
  },
});