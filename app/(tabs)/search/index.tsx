import EmptyState from "@/components/shared/EmptyState";
import { useContentPadding } from "@/hooks/use-content-padding";
import { useMusic } from "@/hooks/use-music";
import { useMusicApi } from "@/hooks/use-music-api";
import { Song } from "@/types/music";
import { getUpgradedThumb } from "@/utils/image-helpers";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ==================== TYPES ====================

export type ResultItem = {
  id: string;
  type: "artist" | "song" | "album";
  title: string;
  artist_name: string;
  artist_id?: string | null;
  album_id?: string | null;
  album_name?: string | null;
  duration?: string;
  duration_seconds?: number;
  thumbnail?: string;
};

// ==================== CONSTANTS ====================

const BG = "#0f0f0f";
const RECENTS_KEY = "search.recents.v1";

// ==================== SCREEN ====================

export default function SearchScreen() {
  const router = useRouter();
  const { searchSongs } = useMusicApi();
  const { playSingle } = useMusic();
  const contentPadding = useContentPadding();
  const { t } = useTranslation("search");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResultItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);
  const [serviceError, setServiceError] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const fade = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.timing(ty, { toValue: 0, duration: 160, useNativeDriver: true }),
    ]).start();
  }, [fade, ty]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(RECENTS_KEY);
        setRecents(raw ? JSON.parse(raw) : []);
      } catch { }
    })();
  }, []);

  // ==================== HELPERS ====================

  const mapResults = (res: any): ResultItem[] => {
    let artistsSrc: any[] = [];
    let songsSrc: any[] = [];
    let albumsSrc: any[] = [];

    if (Array.isArray(res)) {
      songsSrc = res;
    } else if (res && typeof res === "object") {
      if (res.artist) artistsSrc.push(res.artist);
      if (Array.isArray(res.artists)) artistsSrc.push(...res.artists);
      if (Array.isArray(res.artistSongs)) songsSrc.push(...res.artistSongs);
      if (Array.isArray(res.songs)) songsSrc.push(...res.songs);
      if (Array.isArray(res.search?.songs)) songsSrc.push(...res.search.songs);
      if (Array.isArray(res.artistAlbums)) albumsSrc.push(...res.artistAlbums);
      if (Array.isArray(res.search?.albums)) albumsSrc.push(...res.search.albums);
    }

    const mappedArtists: ResultItem[] = artistsSrc.map((a: any) => ({
      id: a.artist_id ?? a.id,
      title: a.name ?? a.title,
      artist_name: a.subtitle || "Artist",
      artist_id: a.artist_id ?? a.id ?? null,
      duration: "",
      thumbnail: getUpgradedThumb(a, 256),
      type: "artist",
    }));

    const mappedSongs: ResultItem[] = songsSrc.map((s: any) => ({
      id: s.track_id ?? s.id,
      title: s.title,
      artist_name: (s.artists || []).map((ar: any) => ar.name).join(", ") || "",
      artist_id: s.artists?.[0]?.artist_id ?? s.artists?.[0]?.id ?? null,
      album_id: s.go_to?.album_id ?? null,
      album_name: s.album_name ?? null,
      duration: s.duration || "",
      duration_seconds: s.duration_seconds ?? undefined,
      thumbnail: getUpgradedThumb(s, 512),
      type: "song",
    }));

    const mappedAlbums: ResultItem[] = albumsSrc.map((a: any) => ({
      id: a.album_id ?? a.playlistId ?? a.id,
      title: a.title,
      artist_name: (a.artists || []).map((ar: any) => ar.name).join(", ") || "",
      artist_id: a.go_to?.artist_id ?? a.artists?.[0]?.browseId ?? null,
      duration: "",
      thumbnail: getUpgradedThumb(a, 512),
      type: "album",
    }));

    const seen = new Set<string>();
    return [...mappedArtists, ...mappedSongs, ...mappedAlbums].filter((it) => {
      if (!it.id) return false;
      const key = `${it.type}:${it.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const saveRecent = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    const next = [trimmed, ...recents.filter((r) => r.toLowerCase() !== trimmed.toLowerCase())].slice(0, 8);
    setRecents(next);
    try {
      await AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    } catch { }
  }, [recents]);

  const clearRecents = useCallback(async () => {
    setRecents([]);
    try {
      await AsyncStorage.removeItem(RECENTS_KEY);
    } catch { }
  }, []);

  const doSearch = useCallback(async (forceQ?: string) => {
    const q = (forceQ ?? query).trim();
    if (!q) return;
    if (forceQ !== undefined && forceQ !== query) setQuery(forceQ);
    setLoading(true);
    try {
      const res = await searchSongs(q);
      if (res && typeof res === "object" && !Array.isArray(res) && (res as any).error) {
        setResults([]);
        setServiceError(true);
        return;
      }
      setServiceError(false);
      setResults(mapResults(res));
      await saveRecent(q);
    } catch (e) {
      console.error("search error", e);
      setResults([]);
      setServiceError(true);
    } finally {
      setLoading(false);
    }
  }, [query, searchSongs, saveRecent]);

  const onSelect = (item: ResultItem) => {
    if (item.type === "song") {
      playSingle(
        {
          id: item.id,
          title: item.title,
          artist_name: item.artist_name ?? "",
          artist_id: item.artist_id ?? undefined,
          thumbnail: item.thumbnail ?? "",
          url: "",
          duration: item.duration,
          duration_seconds: item.duration_seconds ?? undefined,
          album_id: item.album_id ?? undefined,
          album_name: item.album_name ?? undefined,
        } as Song,
        {
          type: "search",
          id: item.id,
          name: item.title,
          thumb: item.thumbnail ?? "",
        },
      );
    } else if (item.type === "album") {
      router.push(`/(tabs)/search/album/${item.id}`);
    } else {
      router.push(`/(tabs)/search/artist/${item.id}`);
    }
  };

  const typeLabel = (type: ResultItem["type"]) =>
    type === "song" ? t("labels.song") : type === "album" ? t("labels.album") : t("labels.artist");

  const showRecents = results === null && !loading;
  const showNoResults = !loading && results !== null && results.length === 0;
  const showResults = !!results && results.length > 0;

  // ==================== RENDER ====================

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          animation: "none",
          fullScreenGestureEnabled: true,
          contentStyle: { backgroundColor: BG },
        }}
      />
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: BG }}>
        <Animated.View style={{ flex: 1, backgroundColor: BG, opacity: fade, transform: [{ translateY: ty }] }}>

          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#888" />
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={(text) => {
                setQuery(text);
                if (text === "") setResults(null);
              }}
              onSubmitEditing={() => doSearch()}
              placeholder={t("input.placeholder")}
              placeholderTextColor="#aaa"
              style={styles.searchInput}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setQuery("");
                  setResults(null);
                  inputRef.current?.focus();
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color="#888" />
              </TouchableOpacity>
            )}
          </View>

          {/* Recents header */}
          {showRecents && recents.length > 0 && (
            <View style={styles.recentsHeader}>
              <Text style={styles.sectionTitle}>{t("recents.title")}</Text>
              <TouchableOpacity onPress={clearRecents} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Text style={styles.clearText}>{t("recents.clear")}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Recents list / empty */}
          {showRecents && (
            <View style={{ flex: 1 }}>
              {recents.length === 0 ? (
                <EmptyState
                  icon="search"
                  iconSize={72}
                  iconColor="#3a3a3a"
                  message={t("recents.emptyMessage")}
                  submessage={t("recents.emptySubmessage")}
                />
              ) : (
                <FlatList
                  data={recents}
                  keyExtractor={(s) => s}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={contentPadding}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.recentRow} onPress={() => doSearch(item)}>
                      <Ionicons name="time" size={16} color="#9aa0a6" />
                      <Text style={styles.recentText} numberOfLines={1}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          )}

          {loading && (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          )}

          {/* Results */}
          {showResults && (
            <FlatList
              data={results!}
              keyExtractor={(it) => `${it.type}:${it.id}`}
              contentContainerStyle={[{ paddingTop: 8 }, contentPadding]}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.resultRow} onPress={() => onSelect(item)} activeOpacity={0.8}>
                  {item.thumbnail ? (
                    <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
                  ) : (
                    <View style={styles.thumbFallback}>
                      <Ionicons name="musical-notes" size={18} color="#9aa0a6" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.resultSubtitle} numberOfLines={1}>
                      {item.type === "artist"
                        ? typeLabel(item.type)
                        : `${typeLabel(item.type)} • ${item.artist_name}`}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9aa0a6" />
                </TouchableOpacity>
              )}
            />
          )}

          {/* No results / error */}
          {showNoResults && (
            <EmptyState
              icon="search"
              iconSize={72}
              iconColor="#3a3a3a"
              message={serviceError ? t("results.serviceError") : t("results.noResults")}
              submessage={serviceError ? t("results.serviceErrorHint") : t("results.noResultsHint")}
            />
          )}

        </Animated.View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#141414",
    borderRadius: 28,
    paddingHorizontal: 14,
    height: 44,
    marginHorizontal: 12,
    marginVertical: 8,
  },
  searchInput: { flex: 1, marginHorizontal: 10, color: "#fff" },
  recentsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginHorizontal: 12,
    justifyContent: "space-between",
  },
  sectionTitle: { color: "#9aa0a6", fontSize: 12, textTransform: "uppercase" },
  clearText: { color: "#9aa0a6", fontSize: 12 },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  recentText: { color: "#fff", fontSize: 15, flex: 1 },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 12,
  },
  thumb: { width: 44, height: 44, borderRadius: 8, backgroundColor: "#1a1a1a" },
  thumbFallback: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
  },
  resultTitle: { color: "#fff", fontSize: 15, fontWeight: "600" },
  resultSubtitle: { color: "#9aa0a6", fontSize: 12, marginTop: 2 },
});