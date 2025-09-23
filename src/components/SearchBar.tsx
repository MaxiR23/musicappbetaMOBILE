import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
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
import { useMusic } from "./../hooks/use-music";
import { useMusicApi } from "./../hooks/use-music-api";

type ResultItem = {
  id: string;
  title: string;
  artistName: string;
  artistId?: string | null;
  duration?: string;
  thumbnail?: string;
  type: "artist" | "song";
};

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const { playFromList } = useMusic();
  const { searchSongs } = useMusicApi();

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await searchSongs(query);

      const mappedArtists: ResultItem[] = (res.artists || []).map((a: any) => ({
        id: a.artistId,
        title: a.name,
        artistName: a.subtitle || "Artist",
        artistId: a.artistId,
        duration: "",
        thumbnail: a.thumbnails?.[1]?.url || a.thumbnails?.[0]?.url || undefined,
        type: "artist",
      }));

      const mappedSongs: ResultItem[] = (res.songs || []).map((s: any) => ({
        id: s.videoId,
        title: s.title,
        artistName: s.artists?.map((ar: any) => ar.name).join(", ") || "",
        artistId: s.artists?.[0]?.browseId ?? s.artists?.[0]?.id ?? null,
        duration: s.duration || "",
        thumbnail: s.thumbnails?.[0]?.url || undefined,
        type: "song",
      }));

      setResults([...mappedArtists, ...mappedSongs]);
    } catch (err) {
      console.error("❌ Error en búsqueda:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(item: ResultItem) {
    if (item.type === "song") {
      // armamos un track mínimo con las keys que usa el player
      const track = {
        id: item.id,
        title: item.title,
        artistName: item.artistName ?? "",
        artistId: item.artistId ?? null,
        thumbnail: item.thumbnail ?? "",
        url: "",                 // el URL real lo arma TrackPlayer con BASE_URL
        duration: item.duration, // opcional
        durationSeconds: undefined,
        albumId: null,
      };
      playFromList([track] as any, 0, { type: "queue", name: null }); // ▶️ reproduce ya
    } else if (item.type === "artist") {
      router.push(`/artist/${item.id}`);
    }
    setResults([]);
    setQuery(item.title);
  }

  function clearQuery() {
    setQuery("");
    setResults([]);
  }

  return (
    <View style={styles.wrapper}>
      {/* 🔍 Barra */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#888" />

        <TextInput
          placeholder="Search song or artist..."
          placeholderTextColor="#aaa"
          style={styles.searchInput}
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            if (t === "") setResults([]);
          }}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />

        {/* ⏳ Spinner inline (chico) */}
        {loading && (
          <ActivityIndicator
            size="small"
            color="#888"
            style={styles.inlineSpinner}
          />
        )}

        {/* ❌ Clear (aparece sólo si hay texto) */}
        {query.length > 0 && !loading && (
          <TouchableOpacity onPress={clearQuery} style={styles.iconButton} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Ionicons name="close" size={18} color="#bbb" />
          </TouchableOpacity>
        )}

        {/* 🎙️ Mic / buscar manual */}
        <TouchableOpacity onPress={handleSearch} style={styles.iconButton} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Ionicons name="mic" size={20} color="#888" />
        </TouchableOpacity>
      </View>

      {/* 🎶 Resultados */}
      {results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          style={styles.results}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultItem}
              onPress={() => handleSelect(item)}
            >
              {item.thumbnail && (
                <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.resultTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.resultSubtitle} numberOfLines={1}>
                  {item.type === "artist"
                    ? item.artistName
                    : `${item.artistName} • ${item.duration}`}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginHorizontal: 8,
    color: "#fff",
  },
  inlineSpinner: {
    marginRight: 6,
  },
  iconButton: {
    paddingHorizontal: 4,
  },
  results: {
    marginTop: 2,
    backgroundColor: "#222",
    borderRadius: 8,
    maxHeight: 250,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderBottomColor: "#333",
    borderBottomWidth: 1,
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginRight: 10,
  },
  resultTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  resultSubtitle: {
    color: "#aaa",
    fontSize: 12,
  },
});