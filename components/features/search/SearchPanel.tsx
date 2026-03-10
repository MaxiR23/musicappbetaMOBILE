import EmptyState from "@/components/shared/EmptyState";
import SearchBar from "@/components/shared/SearchBar";
import { getUpgradedThumb } from "@/utils/image-helpers";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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

type Props = {
  searchFn: (
    q: string
  ) => Promise<
    | ResultItem[]
    | {
      artist?: any;
      artists?: any[];
      songs?: any[];
      artistSongs?: any[];
      artistAlbums?: any[];
      search?: { songs?: any[]; albums?: any[] };
    }
  >;
  onSelect: (item: ResultItem) => void;
  onClose: () => void;
  contentPadding?: { paddingBottom: number };
  placeholder?: string;
  titleRecents?: string;
};

const BG = "#0f0f0f";
const RECENTS_KEY = "search.recents.v1";

export default function SearchPanel({
  searchFn,
  onSelect,
  onClose,
  contentPadding,
  placeholder = "Buscar canción o artista...",
  titleRecents = "Búsquedas recientes",
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResultItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);
  const [serviceError, setServiceError] = useState(false);

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
    const merged = [...mappedArtists, ...mappedSongs, ...mappedAlbums].filter((it) => {
      if (!it.id) return false;
      const key = `${it.type}:${it.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return merged;
  };

  const saveRecent = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      const next = [trimmed, ...recents.filter((r) => r.toLowerCase() !== trimmed.toLowerCase())].slice(0, 8);
      setRecents(next);
      try {
        await AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(next));
      } catch { }
    },
    [recents]
  );

  const clearRecents = useCallback(async () => {
    setRecents([]);
    try {
      await AsyncStorage.removeItem(RECENTS_KEY);
    } catch { }
  }, []);

  const doSearch = useCallback(
    async (forceQ?: string) => {
      const q = (forceQ ?? query).trim();
      if (!q) return;
      if (forceQ !== undefined && forceQ !== query) setQuery(forceQ);
      setLoading(true);
      try {
        const res = await searchFn(q);

        // Error del servicio — no cachear reciente, mostrar error
        if (res && typeof res === 'object' && !Array.isArray(res) && (res as any).error) {
          setResults([]);
          setServiceError(true);
          return;
        }

        setServiceError(false);
        const finalResults = mapResults(res);
        setResults(finalResults);
        await saveRecent(q);
      } catch (e) {
        console.error("search error", e);
        setResults([]);
        setServiceError(true);
      } finally {
        setLoading(false);
      }
    },
    [query, searchFn, saveRecent]
  );

  const typeLabel = (t: ResultItem["type"]) => (t === "song" ? "Canción" : t === "album" ? "Álbum" : "Artista");

  const showRecents = results === null && !loading;
  const showNoResults = !loading && results !== null && results.length === 0;
  const showResults = !!results && results.length > 0;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: BG }}>
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: BG,
          opacity: fade,
          transform: [{ translateY: ty }],
        }}
      >
        <SearchBar
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            if (t === "") setResults(null);
          }}
          onSubmit={() => doSearch()}
          onClear={() => {
            setResults(null);
            onClose();
          }}
          placeholder={placeholder}
          loading={loading}
        /* autoFocus */ /* No necesito que se autofoquee */
        />

        {showRecents && recents.length > 0 && (
          <View style={styles.recentsHeader}>
            <Text style={styles.sectionTitle}>{titleRecents}</Text>
            <TouchableOpacity onPress={clearRecents} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Text style={styles.clearText}>Limpiar</Text>
            </TouchableOpacity>
          </View>
        )}

        {showRecents && (
          <View style={{ flex: 1 }}>
            {recents.length === 0 ? (
              <EmptyState
                icon="search"
                iconSize={72}
                iconColor="#3a3a3a"
                message="Sin búsquedas recientes"
                submessage="Tus busquedas recientes van a aparecer aqui"
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
                      ? `${typeLabel(item.type)}`
                      : item.type === "song"
                        ? `${typeLabel(item.type)} • ${item.artist_name}`
                        : `${typeLabel(item.type)} • ${item.artist_name}`}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9aa0a6" />
              </TouchableOpacity>
            )}
          />
        )}

        {showNoResults && (
          <EmptyState
            icon="search"
            iconSize={72}
            iconColor="#3a3a3a"
            message={serviceError ? "No se pudo realizar la búsqueda" : "No hay resultados"}
            submessage={serviceError ? "Intentá de nuevo más tarde" : "Probá con otro término"}
          />
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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