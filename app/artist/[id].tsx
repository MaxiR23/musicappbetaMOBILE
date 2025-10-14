import { formatEventDateTime } from "@/src/utils/durations";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { ArtistSkeletonLayout } from "./../../src/components/skeletons/Skeleton";
import { useDetailScreen } from "./../../src/hooks/use-detail-screen";
import { useMusic } from "./../../src/hooks/use-music";
import { useMusicApi } from "./../../src/hooks/use-music-api";
import { upgradeYtmImage } from "./../../src/utils/ytmImage";

import { mapArtistTopSongs } from "@/src/utils/song-mapper";

import HeroSection from "@/src/components/HeroSection";
import HorizontalScrollSection from "@/src/components/HorizontalScrollSection";
import TrackRow from "@/src/components/TrackRow";

export default function ArtistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { currentSong, playFromList } = useMusic();
  const { getArtist } = useMusicApi();
  const router = useRouter();

  const [showAllEvents, setShowAllEvents] = useState(false);

  //hook que maneja la carga del artista
  const { data: artist, loading } = useDetailScreen({
    id,
    fetcher: getArtist,
  });

  const mappedTop = useMemo(() => {
    if (!artist) return [];
    return mapArtistTopSongs(artist.topSongs, {
      artistId: id ?? null,
      defaultArtistName: artist.header?.name,
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
        <HeroSection
          backgroundImage={heroUrl}
          height={300}
          useDirectImage={true}
        >
          <View style={styles.heroInfo}>
            <Text style={styles.artistName}>{artist?.header?.name}</Text>
            <Text style={styles.listeners}>{artist?.header?.monthlyListeners}</Text>
          </View>
        </HeroSection>

        {/* Nuevo lanzamiento */}
        {Array.isArray(artist?.newReleases) && artist.newReleases[0] && (() => {
          const nr = artist.newReleases[0];
          const cover = upgradeYtmImage(nr.thumb, 256);
          return (
            <View style={styles.nrCardWrap}>
              <TouchableOpacity
                style={styles.nrCard}
                onPress={() => router.push(`/album/${nr.id}`)}
                activeOpacity={0.9}
              >
                {/* fila arriba: badge */}
                <View style={styles.nrHeaderRow}>
                  <View style={styles.nrPillSmall}>
                    <Ionicons name="sparkles" size={11} color="#111" />
                    <Text style={styles.nrPillSmallText}>Nuevo lanzamiento</Text>
                  </View>
                </View>

                {/* fila abajo: cover + info + chevron */}
                <View style={styles.nrContentRow}>
                  {cover ? (
                    <Image source={{ uri: cover }} style={styles.nrCoverSmall} />
                  ) : (
                    <View style={styles.nrCoverSmall} />
                  )}

                  <View style={styles.nrInfoCol}>
                    <Text style={styles.nrTitle} numberOfLines={1}>{nr.title}</Text>
                    <Text style={styles.nrArtist} numberOfLines={1}>{nr.artist}</Text>
                    {!!nr.release_date && (
                      <Text style={styles.nrMeta} numberOfLines={1}>
                        {nr.release_date} · {nr.track_count ?? "—"} tracks
                      </Text>
                    )}
                  </View>

                  <View style={styles.nrChevronBox}>
                    <Ionicons name="chevron-forward" size={20} color="#fff" />
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          );
        })()}

        {/* Top Songs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Canciones Populares</Text>
          {artist.topSongs.map((song: any, index: number) => (
            <TrackRow
              key={`topsong-${song.id || song.videoId}-${index}`}
              index={index + 1}
              title={song.title}
              thumbnail={upgradeYtmImage(song.thumbnail, 256)}
              showDuration={false}
              showMoreButton={false}
              onPress={() =>
                playFromList(mappedTop, index, {
                  type: "artist",
                  name: artist.header?.name,
                  thumb: heroUrl,
                })
              }
            />
          ))}
        </View>

        {/* Albums */}
        <HorizontalScrollSection
          title="Álbumes"
          items={artist.albums}
          keyExtractor={(album, idx) => `album-${album.id}-${idx}`}
          imageExtractor={(album) =>
            upgradeYtmImage(album.thumbnails?.[album.thumbnails?.length - 1]?.url, 512)
          }
          titleExtractor={(album) => album.title}
          subtitleExtractor={(album) => album.year}
          onItemPress={(album) => router.push(`/album/${album.id}`)}
        />

        {/* Singles / EPs */}
        {Array.isArray(artist.singles_eps) && artist.singles_eps.length > 0 && (
          <HorizontalScrollSection
            title="Singles / EPs"
            items={artist.singles_eps}
            keyExtractor={(single, idx) => `single-${single.id}-${idx}`}
            imageExtractor={(single) =>
              upgradeYtmImage(single.thumbnails?.[single.thumbnails?.length - 1]?.url, 512)
            }
            titleExtractor={(single) => single.title}
            subtitleExtractor={(single) =>
              `${single.type || ""}${single.type && single.year ? " • " : ""}${single.year || ""}`
            }
            onItemPress={(single) => router.push(`/album/${single.id}`)}
          />
        )}

        {/* Upcoming events */}
        {Array.isArray(artist?.upcomingEvents) && artist.upcomingEvents.length > 0 && (
          <View style={styles.section}>
            <View style={styles.evHeaderRow}>
              <Text style={styles.sectionTitle}>Upcoming events</Text>
              {/* ← sin botón acá */}
            </View>

            {(showAllEvents ? artist.upcomingEvents.slice(0, 10) : artist.upcomingEvents.slice(0, 3)).map((ev: any, i: number) => {
              const when = formatEventDateTime(ev);
              const where = [ev?.venue?.city, ev?.venue?.state || ev?.venue?.country].filter(Boolean).join(", ");
              return (
                <TouchableOpacity
                  key={`event-${ev.id || 'no-id'}-${i}`}
                  style={styles.evCard}
                  activeOpacity={0.9}
                /* onPress={() => ev?.url && router.push({ pathname: "/webview", params: { url: ev.url } })} */
                >
                  <View style={styles.evLeft}>
                    <Text numberOfLines={2} style={styles.evTitle}>{ev.name}</Text>

                    <View style={styles.evRow}>
                      <Ionicons name="calendar-outline" size={14} color="#bbb" />
                      <Text style={styles.evMeta} numberOfLines={1}>{when || "Por confirmar"}</Text>
                    </View>

                    <View style={styles.evRow}>
                      <Ionicons name="location-outline" size={14} color="#bbb" />
                      <Text style={styles.evMeta} numberOfLines={1}>
                        {ev?.venue?.name ? `${ev.venue.name}${where ? " • " : ""}` : ""}{where}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* línea “Show more / Show less” */}
            {artist.upcomingEvents.length > 3 && (
              <TouchableOpacity
                onPress={() => setShowAllEvents(v => !v)}
                activeOpacity={0.8}
                style={styles.evDividerTouchable}
              >
                <View style={styles.evDividerRow}>
                  <View style={styles.evDividerLine} />
                  <Text style={styles.evDividerText}>
                    {showAllEvents ? "Show less" : "Show more"}
                  </Text>
                  <View style={styles.evDividerLine} />
                </View>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Related */}
        {related.length > 0 && (
          <HorizontalScrollSection
            title="Artistas Relacionados"
            items={related}
            keyExtractor={(rel, idx) => `related-${rel.id}-${idx}`}
            imageExtractor={(rel) => upgradeYtmImage(rel.img, 256)}
            titleExtractor={(rel) => rel.name}
            subtitleExtractor={(rel) => rel.subtitle}
            onItemPress={(rel) => {
              if (String(rel.id) === String(id)) return;
              router.push(`/artist/${rel.id}`);
            }}
            cardWidth={100}
            imageHeight={100}
            circularImage={true}
          />
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0e0e0e" },

  section: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 20,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },

  darkBg: { backgroundColor: "#0e0e0e" },

  // Hero
  heroInfo: { position: "absolute", bottom: 20, left: 20 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: "#1DB954" },
  artistName: { fontSize: 28, fontWeight: "bold", color: "#fff", marginTop: 8 },
  listeners: { fontSize: 14, color: "#ccc" },

  // Nuevo lanzamiento
  // wrapper del card
  nrCardWrap: { paddingHorizontal: 16, marginTop: 12 },

  // card en columna (badge arriba, contenido abajo)
  nrCard: {
    backgroundColor: "#161616",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#242424",
    padding: 10,
    gap: 8,
    // sombra sutil
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },

  // fila de cabecera (solo el badge)
  nrHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },

  // pill "Nuevo"
  nrPillSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ffd54a",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  nrPillSmallText: { fontSize: 10, fontWeight: "700", color: "#111" },

  // fila de contenido (cover + info + chevron)
  nrContentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  // portada
  nrCoverSmall: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: "#0e0e0e",
  },

  // columna de info (mantiene tus textos)
  nrInfoCol: { flex: 1, minWidth: 0, gap: 2 },

  // chevron a la derecha, centrado vertical
  nrChevronBox: {
    alignSelf: "center",
    backgroundColor: "#2a2a2a",
    borderRadius: 999,
    padding: 6,
  },

  // textos (tus estilos; por si faltan)
  nrTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  nrArtist: { color: "#ddd", fontSize: 14, },
  nrMeta: { color: "#9aa", fontSize: 12 },

  // Events
  evHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  evCard: {
    backgroundColor: "#161616",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#242424",
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  evLeft: { flex: 1, gap: 6 },
  evTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  evRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  evMeta: { color: "#bbb", fontSize: 12, flexShrink: 1 },

  evMapBtn: {
    marginLeft: 10,
    backgroundColor: "#2a2a2a",
    borderRadius: 10,
    padding: 8,
  },

  // Divider “Show more / Show less”
  evDividerTouchable: {
    marginTop: 6,
  },
  evDividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  evDividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#2a2a2a",
  },
  evDividerText: {
    color: "#ccc",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
});