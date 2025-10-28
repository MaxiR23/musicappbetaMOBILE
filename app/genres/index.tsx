// app/genres/index.tsx
import GenreCard from "@/src/components/shared/GenreCard";
import { useMusicApi } from "@/src/hooks/use-music-api";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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

  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const result = await getGenres();
        if (mounted && result?.ok && result?.genres) {
          setGenres(result.genres);
        }
      } catch (err) {
        console.warn("[genres] Error cargando géneros:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [getGenres]);

  const renderGenre = useCallback(
    ({ item }: { item: Genre }) => (
      <GenreCard
        name={item.name}
        slug={item.slug}
        onPress={() => router.push(`/genres/${encodeURIComponent(item.slug)}`)}
      />
    ),
    [router]
  );

  const keyExtractor = useCallback((item: Genre) => item.id, []);

  return (
    <>
      <StatusBar barStyle="light-content" />
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Explorar géneros</Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      <View style={styles.container}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        ) : (
          <FlatList
            data={genres}
            keyExtractor={keyExtractor}
            renderItem={renderGenre}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#0e0e0e",
  },
  container: {
    flex: 1,
    backgroundColor: "#0e0e0e",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 32,
  },
});