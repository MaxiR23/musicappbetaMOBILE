// app/genres/[slug].tsx
import ReleaseCard from "@/src/components/shared/ReleaseCard";
import { useMusicApi } from "@/src/hooks/use-music-api";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function GenrePlaylistsScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { getGenrePlaylists, getGenreCategories } = useMusicApi();
  const insets = useSafeAreaInsets();

  const [genre, setGenre] = useState<any>(null);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!slug) return;

      try {
        /* DBG */
        /* console.log("[genres] Cargando categorías para:", slug); */
        const result = await getGenreCategories(slug);
        
        /* DBG */
        /* console.log("[genres] Resultado categorías:", result); */

        if (mounted && result?.ok) {
          const cats = result.categories || [];
          setCategories(cats);

          if (cats.length > 0) {
            setActiveCategory(cats[0]);
            //DBG:
            /* console.log("[genres] Primera categoría activada:", cats[0]); */
          }
        }
      } catch (err) {
        console.error("[genres] Error cargando categorías:", err);
        if (mounted) {
          setError("Error al cargar categorías");
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [slug, getGenreCategories]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!slug) return;

      if (playlists.length === 0) {
        setInitialLoading(true);
      }
      setError(null);

      try {
        //DBG:
        /* console.log("[genres] Cargando playlists para:", slug, "categoría:", activeCategory); */

        const result = await getGenrePlaylists(
          slug,
          activeCategory || undefined
        );

        //DBG:
        /* console.log("[genres] Resultado playlists:", result); */

        if (mounted) {
          if (result?.ok) {
            setGenre(result.genre);
            setPlaylists(result.playlists || []);
            //DBG:
            /* console.log("[genres] Género:", result.genre?.name);
            console.log("[genres] Playlists cargadas:", result.playlists?.length || 0); */
          } else {
            console.error("[genres] API retornó ok=false:", result);
            setError(result?.error || "Error al cargar playlists");
          }
        }
      } catch (err) {
        console.error("[genres] ❌ Error cargando playlists:", err);
        if (mounted) {
          setError("Error al cargar playlists");
        }
      } finally {
        if (mounted) {
          setInitialLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [slug, activeCategory, getGenrePlaylists]);

  const renderCard = useCallback(
    ({ item }: { item: any }) => {
      const subtitle = `${item.track_count || 0} canciones`;

      return (
        <ReleaseCard
          cover={null}
          title={item.title}
          subtitle={subtitle}
          onPress={() => router.push(`/genre-playlist/${item.id}`)}
        />
      );
    },
    [router]
  );

  const keyExtractor = useCallback(
    (item: any) => item.id?.toString() || Math.random().toString(),
    []
  );

  return (
    <>
      <StatusBar barStyle="light-content" />
      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
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
            {genre?.name || (initialLoading ? "Cargando..." : "Género")}
          </Text>
          <View style={styles.backBtn} />
        </View>

        {categories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabsScroll}
          >
            <View style={styles.tabsRow}>
              {categories.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setActiveCategory(cat)}
                  style={[
                    styles.tab,
                    activeCategory === cat && styles.tabActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      activeCategory === cat && styles.tabTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        )}

        {initialLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Cargando playlists...</Text>
          </View>
        ) : error ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#888" />
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity
              onPress={() => {
                setError(null);
                setInitialLoading(true);
                setActiveCategory((prev) => prev);
              }}
              style={styles.retryBtn}
            >
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : playlists.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="musical-notes-outline" size={48} color="#888" />
            <Text style={styles.emptyText}>
              No hay playlists disponibles
            </Text>
            <Text style={styles.emptySubtext}>
              {activeCategory ? `en la categoría "${activeCategory}"` : "en este género"}
            </Text>
          </View>
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
    backgroundColor: "#0e0e0e"
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 4,
    flexShrink: 0,        // 👈 FIX - NO SE COMPRIME
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

  tabsScroll: {
    marginTop: 4,
    maxHeight: 56,        // 👈 FIX - ALTURA MÁXIMA
    flexGrow: 0,          // 👈 FIX - NO CRECE
    flexShrink: 0,        // 👈 FIX - NO SE COMPRIME
  },
  tabsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  tab: {
    height: 40,           // 👈 FIX - ALTURA FIJA
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#1e1e1e",
    justifyContent: "center",  // 👈 FIX - CENTRAR CONTENIDO
    alignItems: "center",      // 👈 FIX - CENTRAR CONTENIDO
  },
  tabActive: {
    backgroundColor: "#fff"
  },
  tabText: {
    color: "#ddd",
    fontWeight: "600"
  },
  tabTextActive: {
    color: "#000"
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: "#888",
    fontSize: 14,
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 12,
  },
  emptySubtext: {
    color: "#888",
    fontSize: 14,
    textAlign: "center",
  },

  retryBtn: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#1e1e1e",
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
  },
});