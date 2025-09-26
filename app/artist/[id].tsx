import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ArtistSkeletonLayout } from "./../../src/components/skeletons/Skeleton";
import { useMusic } from "./../../src/hooks/use-music";
import { useMusicApi } from "./../../src/hooks/use-music-api";
import { upgradeYtmImage } from "./../../src/utils/ytmImage";

export default function ArtistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [artist, setArtist] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const { currentSong, playFromList } = useMusic();
  const { getArtist } = useMusicApi();
  const router = useRouter();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getArtist(id as string)
      .then((data) => {
        setArtist(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error cargando artista:", err);
        setLoading(false);
      });
  }, [id]);

  const mappedTop = useMemo(() => {
    if (!artist) return [];
    const artistIdFromRoute = (id ?? null) as string | null;

    return artist.topSongs.map((s: any) => {
      const artistsArr = Array.isArray(s.artists) ? s.artists : [];
      const primary = artistsArr[0] || null;

      const artistName =
        s.artistName ??
        (artistsArr.length ? artistsArr.map((a: any) => a.name).join(", ") : artist.header.name);

      const artistId =
        s.artistId ??
        primary?.id ??
        artistIdFromRoute ??
        null;

      const trackId = s.videoId ?? s.id;

      const albumId = s.albumId ?? s.album?.id ?? null;

      return {
        id: trackId,
        title: s.title,
        thumbnail: s.thumbnail || artist.header.thumbnails?.[0]?.url,
        duration: s.duration,
        durationSeconds: s.durationSeconds,

        artistName,
        artistId,
        artists: artistsArr,

        albumId,
        url: "",
      };
    });
  }, [artist, id]);

  const related = useMemo(() => {
    const src = artist?.related;
    const list = Array.isArray(src) ? src : (src?.items ?? []);

    return (list || [])
      .map((r: any) => {
        const id =
          r.id ?? r.browseId ?? r.channelId ?? r.artistId ?? null;

        const name = r.name ?? r.title ?? r.artist ?? "";
        const subtitle = r.subtitle ?? r.subTitle ?? r.subtext ?? "";

        const img =
          r.thumbnail?.url ??
          r.thumbnail ??
          r.thumbnails?.[r.thumbnails.length - 1]?.url ??
          null;

        return { id, name, subtitle, img };
      })
      .filter((x: any) => x.id && x.name);
  }, [artist]);

  if (loading || !artist) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#0e0e0e" />
        <ArtistSkeletonLayout
          theme={{ baseColor: "#2a2a2a", highlightColor: "#3b3b3b", duration: 1200 }}
          rows={5}
          cards={4}
        />
      </>
    );
  }

  const heroRaw = artist?.header?.thumbnails?.[artist?.header?.thumbnails.length - 1]?.url;
  const heroUrl = upgradeYtmImage(heroRaw, 1200);

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0e0e0e" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: currentSong ? 18 : 18 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={[styles.hero, styles.darkBg]}>
          {heroUrl ? (
            <Image source={{ uri: heroUrl }} style={styles.heroImage} />
          ) : (
            <View style={[styles.heroImage, styles.darkBg]} />
          )}

          {/* Gradiente inferior */}
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

          <View style={styles.heroInfo}>
            <Text style={styles.artistName}>{artist?.header?.name}</Text>
            <Text style={styles.listeners}>{artist?.header?.monthlyListeners}</Text>
          </View>
        </View>

        {/* Top Songs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Canciones Populares</Text>
          {artist.topSongs.map((song: any, index: number) => (
            <TouchableOpacity
              key={song.id || song.videoId || `${index}`}
              style={styles.songRow}
              onPress={() =>
                // 👇 PASAMOS thumb en el source para que el Provider lo loguee en metadata
                playFromList(
                  mappedTop,
                  index,
                  { type: "artist", name: artist.header?.name, thumb: heroUrl }
                )
              }
            >
              <Text style={styles.songIndex}>{index + 1}</Text>
              <Image source={{ uri: upgradeYtmImage(song.thumbnail, 256) }} style={styles.songThumb} />
              <Text style={styles.songTitle}>{song.title}</Text>
              <Text style={styles.songDuration}>{song.duration}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Albums */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Álbumes</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {artist.albums.map((album: any) => (
              <TouchableOpacity
                key={album.id}
                style={styles.albumCard}
                onPress={() => router.push(`/album/${album.id}`)}
              >
                <Image
                  source={{ uri: upgradeYtmImage(album.thumbnails?.[album.thumbnails?.length - 1]?.url, 512) }}
                  style={styles.albumImage}
                />
                <Text style={styles.albumTitle}>{album.title}</Text>
                <Text style={styles.albumYear}>{album.year}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Related */}
        {related.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Artistas Relacionados</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {related.map((rel: any) => (
                <TouchableOpacity
                  key={rel.id}
                  style={styles.relatedCard}
                  onPress={() => {
                    if (String(rel.id) === String(id)) return;
                    router.push(`/artist/${rel.id}`);
                  }}
                >
                {rel.img ? (
                  <Image
                    source={{ uri: upgradeYtmImage(rel.img, 256) }}
                    style={styles.relatedImage}
                  />
                ) : (
                  <View style={[styles.relatedImage, styles.darkBg]} />
                )}
                <Text style={styles.relatedName}>{rel.name}</Text>
                {!!rel.subtitle && (
                  <Text style={styles.relatedSubtitle}>{rel.subtitle}</Text>
                )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0e0e0e" },
  darkBg: { backgroundColor: "#0e0e0e" },

  // Hero
  hero: { height: 300, position: "relative" },
  heroImage: { width: "100%", height: "100%", resizeMode: "cover" },
  heroGradient: { position: "absolute", left: 0, right: 0, bottom: 0, height: "65%" },

  backButton: {
    position: "absolute", top: 40, left: 20, backgroundColor: "#0008", padding: 8, borderRadius: 20,
  },
  heroInfo: { position: "absolute", bottom: 20, left: 20 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: "#1DB954" },
  artistName: { fontSize: 28, fontWeight: "bold", color: "#fff", marginTop: 8 },
  listeners: { fontSize: 14, color: "#ccc" },

  // Sections
  section: { padding: 16 },
  sectionTitle: { fontSize: 20, fontWeight: "bold", color: "#fff", marginBottom: 12 },

  // Top Songs
  songRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  songIndex: { color: "#aaa", width: 20, textAlign: "center" },
  songThumb: { width: 40, height: 40, borderRadius: 4, marginHorizontal: 8 },
  songTitle: { flex: 1, color: "#fff" },
  songDuration: { color: "#aaa", width: 50, textAlign: "right" },

  // Albums
  albumCard: { marginRight: 16, width: 140 },
  albumImage: { width: "100%", height: 140, borderRadius: 8 },
  albumTitle: { color: "#fff", fontWeight: "600", marginTop: 4 },
  albumYear: { color: "#aaa", fontSize: 12 },

  // Related
  relatedCard: { marginRight: 16, alignItems: "center" },
  relatedImage: { width: 100, height: 100, borderRadius: 50 },
  relatedName: { color: "#fff", marginTop: 6, fontWeight: "600" },
  relatedSubtitle: { color: "#aaa", fontSize: 12 },
});
