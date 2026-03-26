import GenreCard from "@/components/shared/GenreCard";
import LoadingView from "@/components/shared/LoadingView";
import ScreenHeader from "@/components/shared/ScreenHeader";
import { useContentPadding } from "@/hooks/use-content-padding";
import { useMounted } from "@/hooks/use-mounted";
import { useMusicApi } from "@/hooks/use-music-api";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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
  const isMounted = useMounted();
  const contentPadding = useContentPadding();
  const { t } = useTranslation("explore");

  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const result = await getGenres();
        if (isMounted() && result?.ok && result?.genres) {
          setGenres(result.genres);
        }
      } catch (err) {
        console.warn("[genres] Error cargando géneros:", err);
      } finally {
        if (isMounted()) setLoading(false);
      }
    })();
  }, [getGenres, isMounted]);

  const renderGenre = useCallback(
    ({ item }: { item: Genre }) => (
      <GenreCard
        name={item.name}
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
    paddingTop: 4,
    paddingBottom: 24,
  },
});