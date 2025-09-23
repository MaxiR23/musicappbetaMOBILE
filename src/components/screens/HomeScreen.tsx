import PlaylistCover from "@/src/components/PlaylistCover";
import { useMusicApi } from "@/src/hooks/use-music-api";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SearchBar from "./../SearchBar";

import CreatePlaylistModal from "@/src/components/CreatePlaylistModal";

// 🆕 supabase para cerrar sesión y leer usuario
import { supabase } from "@/src/lib/supabase";

// 🆕 Sheet genérico (DRY) para el submenú del avatar
import TrackActionsSheet from "@/src/components/TrackActionsSheet";

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
  const { searchSongs, getPlaylists } = useMusicApi();
  const [playlists, setPlaylists] = useState<any[]>([]);
  const router = useRouter();

  const [createOpen, setCreateOpen] = useState(false);

  // 🆕 user para avatar e iniciales (no hace falta provider)
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [userId, setUserId] = useState<string>("");

  // 🆕 control del submenú del avatar
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);

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
      const pls = await getPlaylists();
      console.log("[API] playlists:", pls);
      setPlaylists(pls);
    } catch (e: any) {
      console.warn("[API] getPlaylists error:", e?.message || e);
    }
  }, [getPlaylists]);

  useEffect(() => {
    refreshPlaylists();
  }, [refreshPlaylists]);

  useFocusEffect(
    useCallback(() => {
      refreshPlaylists();
    }, [refreshPlaylists])
  );

  async function handleSearch() {
    const data = await searchSongs(query);
    setResults(data.songs || []);
  }

  // 🆕 cerrar sesión (usado por el submenú)
  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setPlaylists([]);
      setProfileSheetOpen(false);
      router.replace("/login");
    } catch (err) {
      console.warn("Error al cerrar sesión:", err);
    }
  }, [router]);

  return (
    <>
      {/* 🔍 Barra de búsqueda (protegida con SafeAreaView) */}
      <SafeAreaView edges={["top"]} style={{ backgroundColor: "#0e0e0e" }}>
        <View style={{ paddingTop: 16, paddingHorizontal: 16, paddingBottom: 0 }}>
          {/* 🆕 Search + avatar en fila */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <SearchBar />
            </View>

            {/* 🆕 Botón redondito → abre submenú (no cierra sesión directo) */}
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

      {/* 🔽 Contenido scrolleable */}
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
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
          <Text style={styles.sectionTitle}>Seleccionar Categorías</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categories}
          >
            {["All", "Relax", "Sad", "Party", "Romance"].map((cat, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.categoryButton,
                  cat === "All" && styles.categoryButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    cat === "All" && styles.categoryTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 🔥 Tus playlists */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Canciones Populares</Text>
          <View style={styles.popularRow}>
            <TouchableOpacity style={styles.createCard} onPress={() => setCreateOpen(true)}>
              <Ionicons name="add" size={24} color="#fff" />
              <Text style={styles.createText}>Crear playlist</Text>
            </TouchableOpacity>

            {playlists.map((pl) => {
              const imagesFromTracks: string[] = (pl?.playlist_tracks || [])
                .map((t: any) => t?.tracks?.thumbnail_url || t?.thumbnail_url)
                .filter(Boolean);
              const images: string[] = pl?.cover_url
                ? [pl.cover_url, ...imagesFromTracks]
                : imagesFromTracks;

              return (
                <TouchableOpacity
                  key={`${pl.id}-${pl.updated_at ?? ""}`}
                  style={styles.songCard}
                  onPress={() => router.push(`/playlist/${encodeURIComponent(pl.id)}`)}
                  activeOpacity={0.8}
                >
                  <PlaylistCover images={images} size={160} borderRadius={20} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Modal crear playlist */}
      <CreatePlaylistModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={async () => {
          await refreshPlaylists();
        }}
      />

      {/* 🆕 Submenú del avatar reutilizando TrackActionsSheet */}
      <TrackActionsSheet
        open={profileSheetOpen}
        onOpenChange={setProfileSheetOpen}
        track={null} // modo genérico
        headerTitle="Cuenta"
        subtitle={`${userName || "Usuario"}${userEmail ? " • " + userEmail : ""}`}
        showAddTo={false}
        showRemove={false}
        showShare={false}
        extraActions={[
          {
            key: "logout",
            label: "Cerrar sesión",
            icon: "log-out-outline",
            onPress: handleSignOut,
          },
          // más adelante podés sumar “Configuración”, etc.
        ]}
      />

      {/* 🎶 Player fijo abajo */}
      {/* <MusicPlayer /> */}
    </>
  );
}

// 🎨 ESTILOS (sin cambios)
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
  section: { marginBottom: 24 },
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