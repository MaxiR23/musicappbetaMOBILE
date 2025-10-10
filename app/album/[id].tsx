// app/album/[id].tsx
import TrackActionsSheet from "@/src/components/TrackActionsSheet";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AlbumSkeletonLayout } from "../../src/components/skeletons/Skeleton";
import { useMusic } from "../../src/hooks/use-music";
import { useMusicApi } from "../../src/hooks/use-music-api";
import { getThemeFromImage } from "../../src/utils/colorUtils.native";

export default function AlbumScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [album, setAlbum] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [heroColor, setHeroColor] = useState<string>("#222");

  const { playFromList, currentSong } = useMusic();
  const { getAlbum } = useMusicApi();
  const router = useRouter();

  const [actionsOpen, setActionsOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<any | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getAlbum(id as string)
      .then(async (data) => {
        setAlbum(data);
        try {
          const url =
            data?.info?.thumbnails?.[data.info.thumbnails.length - 1]?.url ||
            data?.info?.thumbnails?.[0]?.url;
          if (url && typeof getThemeFromImage === "function") {
            const col = await getThemeFromImage(url);
            const pick = pickHex(col) || "#222";
            setHeroColor(pick);
          }
        } catch { }
        setLoading(false);
      })
      .catch((err) => {
        console.error("❌ Error cargando álbum:", err);
        setLoading(false);
      });
  }, [id]);

  function pickHex(obj: any): string | undefined {
    if (!obj) return;
    if (typeof obj === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(obj)) return obj;
    if (typeof obj === "object") {
      for (const v of Object.values(obj)) {
        const found = pickHex(v);
        if (found) return found;
      }
    }
  }
  function hexToRgba(hex: string, a: number) {
    const m = hex.replace("#", "");
    const v =
      m.length === 3
        ? m.split("").map((x) => parseInt(x + x, 16))
        : [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
    return `rgba(${v[0]},${v[1]},${v[2]},${a})`;
  }

  const coverUrl =
    album?.info?.thumbnails?.[album?.info?.thumbnails?.length - 1]?.url ||
    album?.info?.thumbnails?.[0]?.url ||
    "";

  const mappedSongs = useMemo(() => {
    if (!album) return [];
    const albumIdFromRoute = (id ?? null) as string | null;

    return album.tracks.map((s: any) => {
      const artists = Array.isArray(s.artists) ? s.artists : [];
      const primary = artists[0] || null;

      const artistName =
        s.artistName ??
        (artists.length ? artists.map((a: any) => a.name).join(", ") : "");

      const artistId =
        s.artistId ??
        (primary && primary.id ? primary.id : null);

      const trackId = s.videoId || s.id;

      return {
        id: trackId,
        title: s.title,
        artistName,
        artistId,
        artists,
        albumId: albumIdFromRoute,
        duration: s.duration || null,
        durationSeconds: s.durationSeconds || null,
        thumbnail: coverUrl || "",
      };
    });
  }, [album, id, coverUrl]);

  const albumMeta = useMemo(() => {
    if (!album?.info) return "";
    const { year, songCount, durationText } = album.info as {
      year?: number; songCount?: number; durationText?: string;
    };

    const parts: string[] = [];

    if (year) parts.push(String(year));
    if (typeof songCount === "number") {
      parts.push(`${songCount} ${songCount === 1 ? "canción" : "canciones"}`);
    }
    if (durationText) {
      let dt = String(durationText);
      dt = dt
        .replace(/\bminutes?\b/gi, "min")
        .replace(/\bminutos?\b/gi, "min")
        .replace(/\bhours?\b/gi, "h")
        .replace(/\bhoras?\b/gi, "h");
      parts.push(dt);
    }

    return parts.join(" • ");
  }, [album]);

  if (loading || !album) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
        <AlbumSkeletonLayout
          theme={{ baseColor: "#2a2a2a", highlightColor: "#3b3b3b", duration: 1200 }}
          tracks={6}
          heroHeight={360}
        />
      </ScrollView>
    );
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: currentSong ? 18 : 32 }}>
        {/* Hero Section */}
        <View style={styles.hero}>
          <Image source={{ uri: coverUrl }} style={styles.heroImage} />
          <LinearGradient
            colors={[
              "transparent",
              "rgba(0,0,0,0.35)",
              "rgba(0,0,0,0.75)",
              "#0e0e0e",
            ]}
            locations={[0.55, 0.80, 0.95, 1]}
            style={styles.heroGradient}
          />
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Info debajo del hero */}
        <View style={styles.infoBlock}>
          <Text style={styles.albumTitle}>{album.info?.title}</Text>
          {!!albumMeta && <Text style={styles.albumMeta}>{albumMeta}</Text>}
          {!!album.info?.subtitle && <Text style={styles.albumSubtitle}>{album.info?.subtitle}</Text>}
          {!!album.info?.secondSubtitle && <Text style={styles.albumSubtitle}>{album.info?.secondSubtitle}</Text>}
        </View>

        {/* Botones */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.softButton}
            onPress={() =>
              playFromList(
                mappedSongs,
                0,
                { type: "album", name: album.info?.title, thumb: coverUrl } // ← PASAMOS THUMB
              )
            }
          >
            <Ionicons name="play" size={18} color="#fff" />
            <Text style={styles.softButtonText}>Reproducir</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.softButtonAlt}
            onPress={() => {
              const randomIndex = Math.floor(Math.random() * mappedSongs.length);
              playFromList(
                mappedSongs,
                randomIndex,
                { type: "album", name: album.info?.title, thumb: coverUrl } // ← PASAMOS THUMB
              );
            }}
          >
            <Ionicons name="shuffle" size={18} color="#fff" />
            <Text style={styles.softButtonText}>Shuffle</Text>
          </TouchableOpacity>
        </View>

        {/* Songs */}
        <View style={styles.section}>
          {album.tracks.map((song: any, index: number) => (
            <View key={`${song.id || "track"}-${index}`} style={styles.songRow}>
              <Text style={styles.songIndex}>{index + 1}</Text>
              <View style={{ flex: 1 }}>
                <TouchableOpacity
                  onPress={() =>
                    playFromList(
                      mappedSongs,
                      index,
                      { type: "album", name: album.info?.title, thumb: coverUrl } // ← PASAMOS THUMB
                    )
                  }
                  activeOpacity={0.85}
                >
                  <Text style={styles.songTitle}>{song.title}</Text>
                  {!!song.artists?.length && (
                    <Text style={styles.songArtists}>
                      {song.artists.map((a: any) => a.name).join(", ")}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
              {/* <Text style={styles.songDuration}>{song.duration}</Text> */}

              <TouchableOpacity
                onPress={() => {
                  setSelectedTrack(mappedSongs[index]);
                  setActionsOpen(true);
                }}
                style={{ padding: 6, marginLeft: 6 }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="ellipsis-vertical" size={16} color="#bbb" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Other versions / Releases for you */}
        {(album.otherVersions?.length || album.releasesForYou?.length) ? (
          <View style={{ paddingHorizontal: 16, marginTop: 8, gap: 18 }}>
            {/* Other versions */}
            {!!album.otherVersions?.length && (
              <View>
                <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 10 }}>
                  Other versions
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {album.otherVersions.map((it: any, i: number) => {
                    const thumb =
                      it.thumbnails?.[it.thumbnails.length - 1]?.url ||
                      it.thumbnails?.[0]?.url || coverUrl;
                    return (
                      <TouchableOpacity
                        key={`ov-${i}-${it.browseId || it.title}`}
                        style={{ width: 140, marginRight: 12 }}
                        activeOpacity={0.85}
                        onPress={() => router.push(`/album/${it.browseId}`)}
                      >
                        <Image source={{ uri: thumb }} style={{ width: 140, height: 140, borderRadius: 10 }} />
                        <Text numberOfLines={2} style={{ color: "#fff", marginTop: 6, fontWeight: "600" }}>
                          {it.title}
                        </Text>
                        <Text numberOfLines={1} style={{ color: "#aaa", fontSize: 12, marginTop: 2 }}>
                          {it.type}{it.artistName ? ` • ${it.artistName}` : ""}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Releases for you */}
            {!!album.releasesForYou?.length && (
              <View>
                <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 10 }}>
                  Releases for you
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {album.releasesForYou.map((it: any, i: number) => {
                    const thumb =
                      it.thumbnails?.[it.thumbnails.length - 1]?.url ||
                      it.thumbnails?.[0]?.url || coverUrl;
                    const route =
                      (it.type || "").toLowerCase() === "playlist"
                        ? `/playlist/${it.browseId}`
                        : `/album/${it.browseId}`;
                    return (
                      <TouchableOpacity
                        key={`rfy-${i}-${it.browseId || it.title}`}
                        style={{ width: 140, marginRight: 12 }}
                        activeOpacity={0.85}
                        onPress={() => router.push(route)}
                      >
                        <Image source={{ uri: thumb }} style={{ width: 140, height: 140, borderRadius: 10 }} />
                        <Text numberOfLines={2} style={{ color: "#fff", marginTop: 6, fontWeight: "600" }}>
                          {it.title}
                        </Text>
                        <Text numberOfLines={1} style={{ color: "#aaa", fontSize: 12, marginTop: 2 }}>
                          {it.type || "Release"}{it.artistName ? ` • ${it.artistName}` : ""}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>
        ) : null}

      </ScrollView>

      <TrackActionsSheet
        open={actionsOpen}
        onOpenChange={setActionsOpen}
        track={selectedTrack}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0e0e0e" },
  hero: { height: 360, position: "relative" },
  heroImage: { width: "100%", height: "100%", resizeMode: "cover" },
  heroGradient: { position: "absolute", left: 0, right: 0, bottom: 0, height: "75%" },
  backButton: {
    position: "absolute",
    top: 40,
    left: 20,
    backgroundColor: "#0008",
    padding: 8,
    borderRadius: 20,
  },

  infoBlock: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  albumTitle: { fontSize: 28, fontWeight: "bold", color: "#fff" },
  albumMeta: { fontSize: 13, color: "#bbb", marginTop: 6 },
  albumSubtitle: { fontSize: 14, color: "#ccc", marginTop: 2 },

  actions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: "center",
  },

  softButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.10)",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  softButtonAlt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  softButtonText: { color: "#fff", fontWeight: "600" },

  section: { paddingHorizontal: 16, marginTop: 8 },
  songRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  songIndex: { color: "#aaa", width: 20, textAlign: "center", marginRight: 8 },
  songThumb: { width: 40, height: 40, borderRadius: 4, marginHorizontal: 8 },
  songTitle: { flex: 1, color: "#fff" },
  songArtists: { color: "#aaa", fontSize: 12, marginTop: 2 },
  songDuration: { color: "#aaa", width: 50, textAlign: "right" },

  skeletonBox: { backgroundColor: "#2a2a2a", borderRadius: 8, opacity: 0.6 },
  skeletonLine: { backgroundColor: "#2a2a2a", borderRadius: 4, opacity: 0.6 },
});