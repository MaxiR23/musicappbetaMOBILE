import PlaylistCover from "@/src/components/PlaylistCover";
import { useMusic } from "@/src/hooks/use-music";
import { useMusicApi } from "@/src/hooks/use-music-api";
import { Ionicons } from "@expo/vector-icons";
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

import CreatePlaylistModal from "@/src/components/CreatePlaylistModal";
import TrackActionsSheet from "@/src/components/TrackActionsSheet";
import { supabase } from "@/src/lib/supabase";
import { fetchFeed } from "@/src/services/feedService";
import { fetchRecommendations } from "@/src/services/recommendService";

import { cacheWrap, DAY_MS } from "@/src/utils/cache";
import HorizontalScrollSection from "../HorizontalScrollSection";

import { getInitials, pickGradient } from "@/src/utils/avatar";
import SearchBar from "../SearchBar";
import SimilarToHeader from "../SimilarToHeader";

type RecentItem = {
  type: "album" | "artist";
  id: string;
  occurred_at: string;
  name?: string | null;
  thumbnail_url?: string | null;
};

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

  // ✅ FEED: estados para 5 secciones
  const [newReleases, setNewReleases] = useState<any[]>([]);
  const [topAlbums, setTopAlbums] = useState<any[]>([]);
  const [topTracks, setTopTracks] = useState<any[]>([]);
  const [newSingles, setNewSingles] = useState<any[]>([]);     // ← NUEVO
  const [seedTracks, setSeedTracks] = useState<any[]>([]);     // ← NUEVO

  const [recoArtists, setRecoArtists] = useState<any[]>([]);
  const [recoAlbums, setRecoAlbums] = useState<any[]>([]);

  const { playFromList } = useMusic();

  const mapTracksForPlayer = useCallback((arr: any[]) => {
    return arr.map((t: any) => ({
      id: String(t.id),
      title: t.title,
      artistName: t.artist ?? "",
      artist: t.artist ?? "",
      thumbnail: t.thumb ?? t.thumbnail,
      thumbnail_url: t.thumb ?? t.thumbnail,
      duration: t.duration ?? null,
      durationSeconds: typeof t.duration_s === "number" ? t.duration_s : null,
      url: "",
    }));
  }, []);

  const mappedTopTracks = useMemo(() => mapTracksForPlayer(topTracks), [topTracks, mapTracksForPlayer]);
  const mappedNewSingles = useMemo(() => mapTracksForPlayer(newSingles), [newSingles, mapTracksForPlayer]); // ← NUEVO
  const mappedSeedTracks = useMemo(() => mapTracksForPlayer(seedTracks), [seedTracks, mapTracksForPlayer]); // ← NUEVO

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
  const playlistsWithCreate = useMemo(() => {
    return [{ id: '__create__', isCreateButton: true }, ...playlists];
  }, [playlists]);

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

  // NUEVO: loaders cacheados para new_singles y seed_tracks
  const refreshNewSingles = useCallback(async () => {
    try {
      const tracks = await cacheWrap(
        `home:feed:new_singles:tracks:20:v1`,
        () => fetchFeed({ kind: "new_singles", type: "track", limit: 20 }),
        { userId, ttl: DAY_MS }
      );
      setNewSingles(tracks);
    } catch (e: any) {
      console.warn("[API] new_singles error:", e?.message || e);
      setNewSingles([]);
    }
  }, [userId]);

  const refreshSeedTracks = useCallback(async () => {
    try {
      const tracks = await cacheWrap(
        `home:feed:seed_tracks:tracks:20:v1`,
        () => fetchFeed({ kind: "seed_tracks", type: "track", limit: 20 }),
        { userId, ttl: DAY_MS }
      );
      setSeedTracks(tracks);
    } catch (e: any) {
      console.warn("[API] seed_tracks error:", e?.message || e);
      setSeedTracks([]);
    }
  }, [userId]);

  // NUEVO: cargar recomendaciones (server decide el límite)
  const refreshRecommendations = useCallback(async () => {
    try {
      const data = await cacheWrap(
        `home:recommendations:weekly_2025w41:v1`,
        () => fetchRecommendations("weekly_2025w41"),
        { userId, ttl: DAY_MS }
      );
      setRecoArtists(Array.isArray(data.artists) ? data.artists : []);
      setRecoAlbums(Array.isArray(data.albums) ? data.albums : []);
    } catch (e: any) {
      console.warn("[API] recommendations error:", e?.message || e);
      setRecoArtists([]);
      setRecoAlbums([]);
    }
  }, [userId]);

  const ready = !!userId;

  // Carga inicial - solo lo importante
  useEffect(() => {
    console.log('🏠 [HOME] Primera carga');
    if (!ready) return;

    refreshPlaylists();
    refreshRecent();
  }, [ready]);

  // Carga secundaria - con un pequeño delay
  useEffect(() => {
    if (!ready) return;

    const timer = setTimeout(() => {
      console.log('🏠 [HOME] Carga secundaria');
      refreshNewReleases();
      refreshTopAlbums();
      refreshTopTracks();
      refreshNewSingles();
      refreshSeedTracks();
      refreshRecommendations();
    }, 100); // 100ms de delay

    return () => clearTimeout(timer);
  }, [ready]);

  // Solo mostramos recientes con info visible (evita cajas vacías)
  const recentVisible = useMemo(
    () =>
      (recent || [])
        .filter((it) => Boolean(it.name) || Boolean(it.thumbnail_url))
        .slice(0, 12),
    [recent]
  );

  // ⬇️ NUEVO: agrupar recomendaciones de artistas por seed (similarTo.id)
  const recoBySeed = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const a of recoArtists || []) {
      const sid = a?.similarTo?.id || "__no_seed__";
      if (!map.has(sid)) map.set(sid, []);
      map.get(sid)!.push(a);
    }
    return Array.from(map.entries()); // [ [seedId, items[]], ... ]
  }, [recoArtists]);

  // ── NUEVO: tomar 2 seeds para ubicar bloques donde quieras ──
  const items1 = useMemo(() => (recoBySeed[0]?.[1] || []), [recoBySeed]);
  const items2 = useMemo(() => (recoBySeed[1]?.[1] || []), [recoBySeed]);
  const seed1 = useMemo(() => {
    const s = items1?.[0]?.similarTo;
    return s ? { name: s.name, thumb: s.thumbnail } : null;
  }, [items1]);
  const seed2 = useMemo(() => {
    const s = items2?.[0]?.similarTo;
    return s ? { name: s.name, thumb: s.thumbnail } : null;
  }, [items2]);

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
        <View style={{ paddingTop: 10, paddingHorizontal: 16, paddingBottom: 8 }}>
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
        <HorizontalScrollSection
          title="Tus playlists"
          items={playlistsWithCreate}
          keyExtractor={(pl) => String(pl.id)}
          imageExtractor={() => ""} // no usado, usamos renderItem
          titleExtractor={() => ""} // no usado, usamos renderItem
          onItemPress={() => { }} // no usado, usamos renderItem
          cardWidth={140}
          imageHeight={140}
          renderItem={(pl) => {
            // Botón crear
            if (pl.isCreateButton) {
              return (
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
              );
            }

            // Tarjetas de playlists
            const imagesFromTracks = (pl?.playlist_tracks || [])
              .map((t: any) => t?.tracks?.thumbnail_url || t?.thumbnail_url)
              .filter(Boolean);
            const images = pl?.cover_url ? [pl.cover_url, ...imagesFromTracks] : imagesFromTracks;
            const SIZE = 140, RADIUS = 16;

            return (
              <TouchableOpacity
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
          }}
        />

        {/* 🆕 Escuchados recientemente — compacto */}
        {recentVisible.length > 0 && (
          <HorizontalScrollSection
            title="Escuchados recientemente"
            items={recentVisible}
            keyExtractor={(it, idx) => `${it.type}:${it.id}:${it.occurred_at}:${idx}`}
            // ignorados porque usamos renderItem
            imageExtractor={() => ""}
            titleExtractor={() => ""}
            onItemPress={() => { }}
            cardWidth={120}
            imageHeight={120}
            renderItem={(it, idx) => {
              const SIZE = 120;
              const isArtist = it.type === "artist";
              const radius = isArtist ? SIZE / 2 : 16;

              return (
                <TouchableOpacity
                  style={{ width: SIZE }}
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
                    <Text numberOfLines={1} style={{ color: "#fff", marginTop: 6, width: SIZE, fontWeight: "600", fontSize: 13 }}>
                      {it.name}
                    </Text>
                  )}
                  <Text style={{ color: "#aaa", width: SIZE, fontSize: 11 }}>
                    {isArtist ? "Artista" : "Álbum"}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        )}

        {/* 🆕 Nuevos lanzamientos (álbumes) */}
        {newReleases.length > 0 && (
          <HorizontalScrollSection
            title="Nuevos lanzamientos"
            items={newReleases}
            keyExtractor={(al) => String(al.id)}
            imageExtractor={(al) => al.thumb}
            titleExtractor={(al) => al.title}
            subtitleExtractor={(al) => al.artist}
            onItemPress={(al) => router.push(`/album/${encodeURIComponent(al.id)}`)}
            cardWidth={120}
            imageHeight={120}
            circularImage={false}
          />
        )}

        {/* ⭐ Similar to (1) — colocado ANTES de “Más escuchados · Álbumes” */}
        {!!items1.length && (
          <>
            <SimilarToHeader name={seed1?.name} thumb={seed1?.thumb} />
            <HorizontalScrollSection
              title={`More like ${seed1?.name ?? "Artista"}`}
              items={items1}
              keyExtractor={(a, idx) => `${a.id}-${idx}`}
              imageExtractor={(a) =>
                Array.isArray(a.thumbnails) && a.thumbnails.length
                  ? a.thumbnails[a.thumbnails.length - 1]?.url
                  : undefined
              }
              titleExtractor={(a) => a.name}
              subtitleExtractor={() => "Artista"}
              onItemPress={(a) => router.push(`/artist/${encodeURIComponent(a.id)}`)}
              cardWidth={120}
              imageHeight={120}
              circularImage
            />
          </>
        )}

        {/* 🔝 Más escuchados · Álbumes */}
        {topAlbums.length > 0 && (
          <HorizontalScrollSection
            title="Más escuchados · Álbumes"
            items={topAlbums}
            keyExtractor={(al) => String(al.id)}
            imageExtractor={(al) => al.thumb}
            titleExtractor={(al) => al.title}
            subtitleExtractor={(al) => al.artist}
            onItemPress={(al) => router.push(`/album/${encodeURIComponent(al.id)}`)}
            cardWidth={120}
            imageHeight={120}
          />
        )}

        {/* 🔝 Más escuchados · Canciones */}
        {topTracks.length > 0 && (
          <HorizontalScrollSection
            title="Más escuchados · Canciones"
            items={topTracks}
            keyExtractor={(t) => String(t.id)}
            imageExtractor={(t) => t.thumb ?? t.thumbnail}
            titleExtractor={(t) => t.title}
            subtitleExtractor={(t) => t.artist}
            onItemPress={(_, index) =>
              playFromList(mappedTopTracks, index, { type: "queue", name: "Top tracks" })
            }
            cardWidth={120}
            imageHeight={120}
            circularImage={false}
          />
        )}

        {/* ⭐ Similar to (2) — colocado DESPUÉS de “Más escuchados · Canciones” */}
        {!!items2.length && (
          <>
            <SimilarToHeader name={seed2?.name} thumb={seed2?.thumb} />
            <HorizontalScrollSection
              title={`More like ${seed2?.name ?? "Artista"}`}
              items={items2}
              keyExtractor={(a, idx) => `${a.id}-${idx}`}
              imageExtractor={(a) =>
                Array.isArray(a.thumbnails) && a.thumbnails.length
                  ? a.thumbnails[a.thumbnails.length - 1]?.url
                  : undefined
              }
              titleExtractor={(a) => a.name}
              subtitleExtractor={() => "Artista"}
              onItemPress={(a) => router.push(`/artist/${encodeURIComponent(a.id)}`)}
              cardWidth={120}
              imageHeight={120}
              circularImage
            />
          </>
        )}

        {/* 🆕 Singles nuevos */}
        {newSingles.length > 0 && (
          <HorizontalScrollSection
            title="Singles nuevos"
            items={newSingles}
            keyExtractor={(t) => String(t.id)}
            imageExtractor={(t) => t.thumb ?? t.thumbnail}
            titleExtractor={(t) => t.title}
            subtitleExtractor={(t) => t.artist}
            onItemPress={(_, index) =>
              playFromList(mappedNewSingles, index, { type: "queue", name: "Singles nuevos" })
            }
            cardWidth={120}
            imageHeight={120}
          />
        )}

        {/* 🧪 Seed tracks (playlist seed) */}
        {seedTracks.length > 0 && (
          <HorizontalScrollSection
            title="Desde tu seed"
            items={seedTracks}
            keyExtractor={(t) => String(t.id)}
            imageExtractor={(t) => t.thumb ?? t.thumbnail}
            titleExtractor={(t) => t.title}
            subtitleExtractor={(t) => t.artist}
            onItemPress={(_, index) =>
              playFromList(mappedSeedTracks, index, { type: "queue", name: "Seed tracks" })
            }
            cardWidth={120}
            imageHeight={120}
          />
        )}

        {/* ⭐ Recomendados · Artistas — UNA FILA POR SEED (resto) */}
        {recoBySeed.slice(2).map(([seedId, items], seedIdx) => {
          const seed = (items?.[0]?.similarTo) || null as any;
          const seedName = seed?.name || "Artistas recomendados";
          const seedThumb = seed?.thumbnail || null;

          return (
            <View key={`seed-${seedId}-${seedIdx}`} style={styles.section}>
              <SimilarToHeader name={seedName} thumb={seedThumb} />
              <HorizontalScrollSection
                title={`More like ${seedName}`}
                items={items}
                keyExtractor={(a, idx) => `${a.id}-${idx}`}
                imageExtractor={(a) =>
                  Array.isArray(a.thumbnails) && a.thumbnails.length
                    ? a.thumbnails[a.thumbnails.length - 1]?.url
                    : undefined
                }
                titleExtractor={(a) => a.name}
                subtitleExtractor={() => "Artista"}
                onItemPress={(a) => router.push(`/artist/${encodeURIComponent(a.id)}`)}
                cardWidth={120}
                imageHeight={120}
                circularImage
              />
            </View>
          );
        })}

        {/* ⭐ Álbumes recomendados */}
        {recoAlbums.length > 0 && (
          <HorizontalScrollSection
            title="Álbumes recomendados"
            items={recoAlbums}
            keyExtractor={(al) => String(al.id)}
            imageExtractor={(al) =>
              Array.isArray(al.thumbnails) && al.thumbnails.length
                ? al.thumbnails[al.thumbnails.length - 1]?.url
                : undefined
            }
            titleExtractor={(al) => al.title ?? al.name}
            subtitleExtractor={(al) => al.artistName}
            onItemPress={(al) => router.push(`/album/${encodeURIComponent(al.id)}`)}
            cardWidth={120}
            imageHeight={120}
          />
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