import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export type ResultItem = {
  id: string;
  title: string;
  artistName: string;
  artistId?: string | null;
  duration?: string;
  thumbnail?: string;
  type: "artist" | "song";
};

type Props = {
  searchFn: (
    q: string
  ) => Promise<
    | ResultItem[]
    | {
        artists?: any[];
        songs?: any[];
      }
  >;
  onSelect: (item: ResultItem) => void;
  onClose: () => void;
  placeholder?: string;
  titleRecents?: string;
};

const BG = "#0f0f0f";
const RECENTS_KEY = "search.recents.v1";

export default function SearchPanel({
  searchFn,
  onSelect,
  onClose,
  placeholder = "Buscar canción o artista...",
  titleRecents = "Búsquedas recientes",
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResultItem[] | null>(null); // null => mostrar recientes
  const [loading, setLoading] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(RECENTS_KEY);
        setRecents(raw ? JSON.parse(raw) : []);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, []);

  const normalizeUrl = (u?: string) => {
    if (!u) return undefined;
    if (u.startsWith("http")) return u;
    return `https:${u.startsWith("//") ? "" : "//"}${u}`;
  };

  const mapResults = (res: any): ResultItem[] => {
    if (Array.isArray(res)) return res.map((r) => ({ ...r, thumbnail: normalizeUrl(r.thumbnail) }));
    const mappedArtists: ResultItem[] = (res?.artists || []).map((a: any) => ({
      id: a.artistId ?? a.id,
      title: a.name ?? a.title,
      artistName: a.subtitle || "Artist",
      artistId: a.artistId ?? a.id ?? null,
      duration: "",
      thumbnail: normalizeUrl(a.thumbnails?.[1]?.url || a.thumbnails?.[0]?.url || a.thumbnailUrl),
      type: "artist",
    }));
    const mappedSongs: ResultItem[] = (res?.songs || []).map((s: any) => ({
      id: s.videoId ?? s.id,
      title: s.title,
      artistName: s.artists?.map((ar: any) => ar.name).join(", ") || "",
      artistId: s.artists?.[0]?.browseId ?? s.artists?.[0]?.id ?? null,
      duration: s.duration || "",
      thumbnail: normalizeUrl(
        s.thumbnails?.[0]?.url || s.thumbnailUrl || s.albumArt?.url || s.thumbnail
      ),
      type: "song",
    }));
    return [...mappedArtists, ...mappedSongs];
  };

  const saveRecent = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      const next = [trimmed, ...recents.filter((r) => r.toLowerCase() !== trimmed.toLowerCase())].slice(0, 8);
      setRecents(next);
      try { await AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(next)); } catch {}
    },
    [recents]
  );

  const clearRecents = useCallback(async () => {
    setRecents([]);
    try { await AsyncStorage.removeItem(RECENTS_KEY); } catch {}
  }, []);

  // ✅ ahora acepta un query forzado (para recientes)
  const doSearch = useCallback(
    async (forceQ?: string) => {
      const q = (forceQ ?? query).trim();
      if (!q) return;
      // si vino forzado, sincronizo el input para que se vea
      if (forceQ !== undefined && forceQ !== query) setQuery(forceQ);
      setLoading(true);
      try {
        const res = await searchFn(q);
        const finalResults = mapResults(res);
        setResults(finalResults);
        await saveRecent(q);
      } catch (e) {
        console.error("search error", e);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [query, searchFn, saveRecent]
  );

  const showRecents = results === null && !loading;
  const showNoResults = !loading && results !== null && results.length === 0;
  const showResults = !!results && results.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: BG, paddingTop: 40 }}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#888" />
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            if (t === "") setResults(null); // vuelve a recientes
          }}
          onSubmitEditing={() => doSearch()}
          placeholder={placeholder}
          placeholderTextColor="#aaa"
          style={styles.searchInput}
          returnKeyType="search"
        />
        {loading && <ActivityIndicator size="small" color="#888" style={{ marginRight: 6 }} />}
        {query.length > 0 && !loading && (
          <TouchableOpacity
            onPress={() => {
              setQuery("");
              setResults(null);
              onClose();
            }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="close" size={18} color="#bbb" />
          </TouchableOpacity>
        )}
      </View>

      {/* HEADER de Recientes: solo si HAY historial */}
      {showRecents && recents.length > 0 && (
        <View style={styles.recentsHeader}>
          <Text style={styles.sectionTitle}>{titleRecents}</Text>
          <TouchableOpacity onPress={clearRecents} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Text style={styles.clearText}>Limpiar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Recientes */}
      {showRecents && (
        <View style={{ flex: 1 }}>
          {recents.length === 0 ? (
            <View style={styles.centerEmpty}>
              <Ionicons name="search" size={72} color="#3a3a3a" />
              <Text style={styles.centerTitle}>Sin búsquedas recientes</Text>
              <Text style={styles.centerSubtitle}>Empezá escribiendo arriba</Text>
            </View>
          ) : (
            <FlatList
              data={recents}
              keyExtractor={(s) => s}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.recentRow}
                  onPress={() => doSearch(item)} // 👈 ejecuta directo con ese término
                >
                  <Ionicons name="time" size={16} color="#9aa0a6" />
                  <Text style={styles.recentText} numberOfLines={1}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}

      {/* Resultados */}
      {showResults && (
        <FlatList
          data={results!}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ paddingTop: 8 }}
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
                  {item.type === "artist" ? item.artistName : `${item.artistName} • ${item.duration || ""}`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9aa0a6" />
            </TouchableOpacity>
          )}
        />
      )}

      {/* No hay resultados */}
      {showNoResults && (
        <View style={styles.centerEmpty}>
          <Ionicons name="search" size={72} color="#3a3a3a" />
          <Text style={styles.centerTitle}>No hay resultados</Text>
          <Text style={styles.centerSubtitle}>Probá con otro término</Text>
        </View>
      )}
    </View>
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
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#1a1a1a",
  },
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

  centerEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  centerTitle: { color: "#fff", fontSize: 16, fontWeight: "700", marginTop: 6 },
  centerSubtitle: { color: "#9aa0a6", fontSize: 13 },
});