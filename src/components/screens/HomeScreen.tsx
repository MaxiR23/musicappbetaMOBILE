import PlaylistCover from "@/src/components/PlaylistCover";
import { useMusic } from "@/src/hooks/use-music";
import { useMusicApi } from "@/src/hooks/use-music-api";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SearchBar from "./../SearchBar";

import CreatePlaylistModal from "@/src/components/CreatePlaylistModal";
import TrackActionsSheet from "@/src/components/TrackActionsSheet";
import { supabase } from "@/src/lib/supabase";
import { fetchFeed } from "@/src/services/feedService";

// 👇 NUEVO: cache genérico
import { cacheWrap, DAY_MS } from "@/src/utils/cache";

type RecentItem = {
  type: "album" | "artist";
  id: string;
  occurred_at: string;
  name?: string | null;
  thumbnail_url?: string | null;
};

// ───────── helpers avatar (gradiente + iniciales) ─────────
const GRADIENTS: [string, string][] = [
  ["#ff9966", "#ff5e62"],
  ["#36D1DC", "#5B86E5"],
  ["#a18cd1", "#fbc2eb"],
  ["#7F00FF", "#E100FF"],
  ["#00c6ff", "#0072ff"],
  ["#11998e", "#38ef7d"],
  ["#f7971e", "#ffd200"],
  ["#fc5c7d", "#6a82fb"],
];

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
function pickGradient(seed: string) {
  const idx = hashStr(seed) % GRADIENTS.length;
  return GRADIENTS[idx];
}
function getInitials(nameOrEmail: string) {
  if (!nameOrEmail) return "U";
  const name = nameOrEmail.trim();
  const base = name.includes("@") ? name.split("@")[0] : name;
  const parts = base.split(/\s+/).filter(Boolean);
  const initials = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return initials.toUpperCase() || "U";
}

export default function HomeScreen() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const { searchSongs, getPlaylists, getRecentPlays } = useMusicApi();
  const [playlists, setPlaylists] = useState<any[]>([]);
  const router = useRouter();

  const [createOpen, setCreateOpen] = useState(false);

  // user para avatar e iniciales
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [userId, setUserId] = useState<string>("");

  // submenú del avatar
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);

  // recientes
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);

  // ✅ FEED: estados para 3 secciones
  const [newReleases, setNewReleases] = useState<any[]>([]);
  const [topAlbums, setTopAlbums] = useState<any[]>([]);
  const [topTracks, setTopTracks] = useState<any[]>([]);

  const { playFromList } = useMusic();

  const mappedTopTracks = useMemo(() => {
    return topTracks.map((t: any) => ({
      id: String(t.id),
      title: t.title,
      artistName: t.artist ?? "",          // MusicProvider usa artistName || artist
      artist: t.artist ?? "",
      thumbnail: t.thumb ?? t.thumbnail,   // acepta thumbnail o thumbnail_url
      thumbnail_url: t.thumb ?? t.thumbnail,
      duration: t.duration ?? null,
      durationSeconds: typeof t.duration_s === "number" ? t.duration_s : null,
      url: "",                             // no hace falta, el provider arma la URL con /music/play
    }));
  }, [topTracks]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const u = data.session?.user;
      setUserId(u?.id ?? "");
      setUserName(
        (u?.user_metadata?.display_name ||
          u?.user_metadata?.name ||
          u?.user_metadata?.full_name ||
          "") as string
      );
      setUserEmail((u?.email ?? u?.user_metadata?.email ?? "") as string);
    })();
  }, []);

  const initials = useMemo(
    () => getInitials(userName || userEmail || "Usuario"),
    [userName, userEmail]
  );
  const gradient = useMemo(
    () => pickGradient(userId || userEmail || userName || "seed"),
    [userId, userEmail, userName]
  );

  const refreshPlaylists = useCallback(async () => {
    try {
      const pls = await cacheWrap(
        `home:playlists:v1`,
        () => getPlaylists(),
        { userId, ttl: DAY_MS }
      );
      setPlaylists(pls);
    } catch (e: any) {
      console.warn("[API] getPlaylists error:", e?.message || e);
    }
  }, [getPlaylists, userId]);

  const refreshRecent = useCallback(async () => {
    try {
      setRecentLoading(true);
      /* const resp = await cacheWrap(
        `home:recent:plays:12:v1`,
        () => getRecentPlays(12),
        { userId, ttl: DAY_MS }
      );
      setRecent(resp?.items ?? []); */

      console.log("[cache] BYPASS → home:recent:plays:12:v1");
      const resp = await getRecentPlays(12);

      setRecent(resp?.items ?? []);
    } catch (e: any) {
      console.warn("[API] getRecentPlays error:", e?.message || e);
      setRecent([]);
    } finally {
      setRecentLoading(false);
    }
  }, [getRecentPlays, userId]);

  // ✅ loaders de feed
  const refreshNewReleases = useCallback(async () => {
    try {
      const albums = await cacheWrap(
        `home:feed:new_releases:AR:albums:20:v1`,
        () => fetchFeed({ kind: "new_releases", type: "album", store: "AR", limit: 20 }),
        { userId, ttl: DAY_MS }
      );
      setNewReleases(albums);
    } catch (e: any) {
      console.warn("[API] new_releases error:", e?.message || e);
      setNewReleases([]);
    }
  }, [userId]);

  const refreshTopAlbums = useCallback(async () => {
    try {
      const albums = await cacheWrap(
        `home:feed:most_played:albums:20:v1`,
        () => fetchFeed({ kind: "most_played", type: "album", limit: 20 }),
        { userId, ttl: DAY_MS }
      );
      setTopAlbums(albums);
    } catch (e: any) {
      console.warn("[API] most_played/albums error:", e?.message || e);
      setTopAlbums([]);
    }
  }, [userId]);

  const refreshTopTracks = useCallback(async () => {
    try {
      const tracks = await cacheWrap(
        `home:feed:most_played:tracks:20:v1`,
        () => fetchFeed({ kind: "most_played", type: "track", limit: 20 }),
        { userId, ttl: DAY_MS }
      );
      setTopTracks(tracks);
    } catch (e: any) {
      console.warn("[API] most_played/tracks error:", e?.message || e);
      setTopTracks([]);
    }
  }, [userId]);

  const ready = !!userId;

  useFocusEffect(
    useCallback(() => {
      if (!ready) return;
      refreshPlaylists();
      refreshRecent();
      // ✅ feed
      refreshNewReleases();
      refreshTopAlbums();
      refreshTopTracks();
    }, [refreshPlaylists, refreshRecent, refreshNewReleases, refreshTopAlbums, refreshTopTracks])
  );

  // Solo mostramos recientes con info visible (evita cajas vacías)
  const recentVisible = useMemo(
    () =>
      (recent || [])
        .filter((it) => Boolean(it.name) || Boolean(it.thumbnail_url))
        .slice(0, 12),
    [recent]
  );

  async function handleSearch() {
    const data = await searchSongs(query);
    setResults(data.songs || []);
  }

  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setPlaylists([]);
      setRecent([]);
      setProfileSheetOpen(false);
      router.replace("/login");
    } catch (err) {
      console.warn("Error al cerrar sesión:", err);
    }
  }, [router]);

  return (
    <>
      {/* 🔍 Barra de búsqueda */}
      <SafeAreaView edges={["top"]} style={{ backgroundColor: "#0e0e0e" }}>
        <View style={{ paddingTop: 10, paddingHorizontal: 16, paddingBottom: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <SearchBar />
            </View>

            <TouchableOpacity
              onPress={() => setProfileSheetOpen(true)}
              activeOpacity={0.9}
              style={{ width: 38, height: 38, borderRadius: 19, overflow: "hidden" }}
            >
              <LinearGradient
                colors={gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 19,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.18)",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "800" }}>{initials}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* 🔽 Contenido */}
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }} bounces={false} overScrollMode="never" showsVerticalScrollIndicator={false}>
        {/* 🎵 Banner */}
        <LinearGradient
          colors={["#00f2fe", "#4facfe"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          <Text style={styles.bannerTitle}>Descubre Nueva Música</Text>
          <Text style={styles.bannerSubtitle}>
            Explora los últimos lanzamientos y artistas destacados
          </Text>
          <TouchableOpacity style={styles.exploreButton}>
            <Text style={styles.exploreButtonText}>Explorar Ahora</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* 🎛️ Categorías */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: 16 }]}>Seleccionar categorías</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories}>
            {["All", "Relax", "Sad", "Party", "Romance"].map((cat, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.categoryButton, cat === "All" && styles.categoryButtonActive]}
              >
                <Text style={[styles.categoryText, cat === "All" && styles.categoryTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 🔥 Tus playlists */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: 16 }]}>Tus playlists</Text>

          {/* ⬇️ Agregá este ScrollView horizontal */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 2 }}
          >
            <View style={styles.popularRow}>
              {/* NO TOCAR: botón crear */}
              <TouchableOpacity
                style={{ width: 140, height: 140, borderRadius: 16, backgroundColor: "#1a1a1a", alignItems: "center", justifyContent: "center" }}
                onPress={() => setCreateOpen(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={28} color="#fff" />
                <Text style={{ color: "#fff", marginTop: 8, fontWeight: "600", fontSize: 13 }}>
                  Crear playlist
                </Text>
              </TouchableOpacity>

              {/* Tarjetas de playlists */}
              {playlists.map((pl) => {
                const imagesFromTracks = (pl?.playlist_tracks || [])
                  .map((t: any) => t?.tracks?.thumbnail_url || t?.thumbnail_url)
                  .filter(Boolean);
                const images = pl?.cover_url ? [pl.cover_url, ...imagesFromTracks] : imagesFromTracks;
                const SIZE = 140, RADIUS = 16;

                return (
                  <TouchableOpacity
                    key={`${pl.id}-${pl.updated_at ?? ""}`}
                    style={{ width: SIZE }}
                    onPress={() => router.push(`/playlist/${encodeURIComponent(pl.id)}`)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={{
                        width: SIZE,
                        height: SIZE,
                        borderRadius: RADIUS,
                        overflow: "hidden",
                        backgroundColor: "#1a1a1a",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {images.length > 0 ? (
                        <PlaylistCover images={images} size={SIZE} borderRadius={RADIUS} />
                      ) : (
                        <Ionicons name="musical-notes" size={28} color="#777" />
                      )}
                    </View>

                    {!!(pl?.title || pl?.name) && (
                      <Text numberOfLines={1} style={{ color: "#fff", marginTop: 6, width: SIZE, fontWeight: "600", fontSize: 13, marginLeft: 8 }}>
                        {pl.title ?? pl.name}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* 🆕 Escuchados recientemente — compacto */}
        {recentVisible.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: 16 }]}>Escuchados recientemente</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {recentVisible.map((it) => {
                const SIZE = 120;                 // 👈 tamaño total de la tapa
                const GAP = 12;                   // 👈 espacio entre items
                const isArtist = it.type === "artist";
                const radius = isArtist ? SIZE / 2 : 16;

                return (
                  <TouchableOpacity
                    key={`${it.type}:${it.id}:${it.occurred_at}`}
                    style={{ marginRight: GAP, width: SIZE }}
                    onPress={() =>
                      router.push(
                        isArtist
                          ? `/artist/${encodeURIComponent(it.id)}`
                          : `/album/${encodeURIComponent(it.id)}`
                      )
                    }
                    activeOpacity={0.85}
                  >
                    <View
                      style={{
                        width: SIZE,
                        height: SIZE,
                        borderRadius: radius,
                        overflow: "hidden",
                        backgroundColor: "#333",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {it.thumbnail_url ? (
                        <Image source={{ uri: it.thumbnail_url }} style={{ width: SIZE, height: SIZE }} />
                      ) : (
                        <Ionicons name="musical-notes-outline" size={22} color="#777" />
                      )}
                    </View>

                    {!!it.name && (
                      <Text
                        numberOfLines={1}
                        style={{ color: "#fff", marginTop: 6, width: SIZE, fontWeight: "600", fontSize: 13 }}
                      >
                        {it.name}
                      </Text>
                    )}
                    <Text style={{ color: "#aaa", width: SIZE, fontSize: 11 }}>
                      {isArtist ? "Artista" : "Álbum"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* 🆕 Nuevos lanzamientos (álbumes) */}
        {newReleases.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: 16 }]}>Nuevos lanzamientos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {newReleases.map((al) => {
                const SIZE = 120;
                const GAP = 12;
                return (
                  <TouchableOpacity
                    key={al.id}
                    style={{ marginRight: GAP, width: SIZE }}
                    onPress={() => router.push(`/album/${encodeURIComponent(al.id)}`)}
                    activeOpacity={0.85}
                  >
                    <View
                      style={{
                        width: SIZE, height: SIZE, borderRadius: 16, overflow: "hidden",
                        backgroundColor: "#333", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      {al.thumb ? (
                        <Image source={{ uri: al.thumb }} style={{ width: SIZE, height: SIZE }} />
                      ) : (
                        <Ionicons name="musical-notes-outline" size={22} color="#777" />
                      )}
                    </View>
                    {!!al.title && (
                      <Text numberOfLines={1} style={{ color: "#fff", marginTop: 6, width: SIZE, fontWeight: "600", fontSize: 13 }}>
                        {al.title}
                      </Text>
                    )}
                    {!!al.artist && (
                      <Text numberOfLines={1} style={{ color: "#aaa", width: SIZE, fontSize: 11 }}>
                        {al.artist}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* 🔝 Más escuchados · Álbumes */}
        {topAlbums.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: 16 }]}>Más escuchados · Álbumes</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {topAlbums.map((al) => {
                const SIZE = 120;
                const GAP = 12;
                return (
                  <TouchableOpacity
                    key={al.id}
                    style={{ marginRight: GAP, width: SIZE }}
                    onPress={() => router.push(`/album/${encodeURIComponent(al.id)}`)}
                    activeOpacity={0.85}
                  >
                    <View
                      style={{
                        width: SIZE, height: SIZE, borderRadius: 16, overflow: "hidden",
                        backgroundColor: "#333", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      {al.thumb ? (
                        <Image source={{ uri: al.thumb }} style={{ width: SIZE, height: SIZE }} />
                      ) : (
                        <Ionicons name="musical-notes-outline" size={22} color="#777" />
                      )}
                    </View>
                    {!!al.title && (
                      <Text numberOfLines={1} style={{ color: "#fff", marginTop: 6, width: SIZE, fontWeight: "600", fontSize: 13 }}>
                        {al.title}
                      </Text>
                    )}
                    {!!al.artist && (
                      <Text numberOfLines={1} style={{ color: "#aaa", width: SIZE, fontSize: 11 }}>
                        {al.artist}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* 🔝 Más escuchados · Canciones */}
        {topTracks.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: 16 }]}>Más escuchados · Canciones</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {topTracks.map((t, i) => {
                const SIZE = 120;
                const GAP = 12;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={{ marginRight: GAP, width: SIZE }}
                    onPress={() => playFromList(mappedTopTracks, i, { type: "queue", name: "Top tracks" })}
                    activeOpacity={0.85}
                  >
                    <View
                      style={{
                        width: SIZE, height: SIZE, borderRadius: 16, overflow: "hidden",
                        backgroundColor: "#333", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      {t.thumb ? (
                        <Image source={{ uri: t.thumb }} style={{ width: SIZE, height: SIZE }} />
                      ) : (
                        <Ionicons name="musical-notes-outline" size={22} color="#777" />
                      )}
                    </View>
                    {!!t.title && (
                      <Text numberOfLines={1} style={{ color: "#fff", marginTop: 6, width: SIZE, fontWeight: "600", fontSize: 13 }}>
                        {t.title}
                      </Text>
                    )}
                    {!!t.artist && (
                      <Text numberOfLines={1} style={{ color: "#aaa", width: SIZE, fontSize: 11 }}>
                        {t.artist}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Modal crear playlist */}
      <CreatePlaylistModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={async () => {
          await refreshPlaylists();
        }}
      />

      {/* Submenú avatar */}
      <TrackActionsSheet
        open={profileSheetOpen}
        onOpenChange={setProfileSheetOpen}
        track={null}
        headerTitle="Cuenta"
        subtitle={`${userName || "Usuario"}${userEmail ? " • " + userEmail : ""}`}
        showAddTo={false}
        showRemove={false}
        showShare={false}
        extraActions={[
          { key: "logout", label: "Cerrar sesión", icon: "log-out-outline", onPress: handleSignOut },
        ]}
      />
    </>
  );
}

// 🎨 ESTILOS
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0e0e0e", padding: 16 },
  searchBar: {
    flexDirection: "row", alignItems: "center", backgroundColor: "red",
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 20,
  },
  searchInput: { flex: 1, marginHorizontal: 8, color: "#fff" },
  avatarCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#888" },
  banner: { borderRadius: 20, padding: 20, marginBottom: 24 },
  bannerTitle: { fontSize: 20, fontWeight: "bold", color: "#fff", marginBottom: 8 },
  bannerSubtitle: { fontSize: 14, color: "#eee", marginBottom: 16 },
  exploreButton: {
    backgroundColor: "#000", paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: 10, alignSelf: "flex-start",
  },
  exploreButtonText: { color: "#fff", fontWeight: "600" },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#fff", marginBottom: 12 },
  categories: { flexDirection: "row" },
  categoryButton: {
    paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20,
    borderWidth: 1, borderColor: "#555", marginRight: 10,
  },
  categoryButtonActive: { backgroundColor: "#fff", borderColor: "#fff" },
  categoryText: { color: "#ccc", fontWeight: "500" },
  categoryTextActive: { color: "#000" },
  popularRow: { flexDirection: "row", gap: 16 },
  createCard: {
    width: 160, height: 160, backgroundColor: "#1a1a1a",
    borderRadius: 20, alignItems: "center", justifyContent: "center",
  },
  createText: { color: "#fff", marginTop: 8, fontWeight: "500" },
  songCard: {
    width: 160, height: 160, borderRadius: 20, overflow: "hidden", backgroundColor: "#333",
  },
  songImage: { width: "100%", height: "100%", resizeMode: "cover" },
});