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
  View
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

  const [showAllEvents, setShowAllEvents] = useState(false);

  function fmtWhen(ev: any) {
    const d = ev?.start?.localDate || "";
    const t = ev?.start?.localTime || "";
    const tz = ev?.start?.timezone ? ` • ${ev.start.timezone}` : "";
    return `${d}${t ? ` ${t}` : ""}${tz}`;
  }

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

        {/* Nuevo lanzamiento */}
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

        {/* Singles / EPs */}
        {Array.isArray(artist.singles_eps) && artist.singles_eps.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Singles / EPs</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {artist.singles_eps.map((s: any) => (
                <TouchableOpacity
                  key={s.id}
                  style={styles.albumCard}
                  onPress={() => router.push(`/album/${s.id}`)}  // ← mismo redirect que álbum
                >
                  <Image
                    source={{
                      uri: upgradeYtmImage(
                        s.thumbnails?.[s.thumbnails?.length - 1]?.url,
                        512
                      ),
                    }}
                    style={styles.albumImage}
                  />
                  <Text style={styles.albumTitle} numberOfLines={2}>{s.title}</Text>
                  <Text style={styles.albumYear}>
                    {s.type || ""}{s.type && s.year ? " • " : ""}{s.year || ""}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Upcoming events */}
        {Array.isArray(artist?.upcomingEvents) && artist.upcomingEvents.length > 0 && (
          <View style={styles.section}>
            <View style={styles.evHeaderRow}>
              <Text style={styles.sectionTitle}>Upcoming events</Text>
              {/* ← sin botón acá */}
            </View>

            {(showAllEvents ? artist.upcomingEvents.slice(0, 10) : artist.upcomingEvents.slice(0, 3)).map((ev: any, i: number) => {
              const when = fmtWhen(ev);
              const where = [ev?.venue?.city, ev?.venue?.state || ev?.venue?.country].filter(Boolean).join(", ");
              return (
                <TouchableOpacity
                  key={`${ev.id}-${i}`}
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

  // Related
  relatedCard: { marginRight: 16, alignItems: "center" },
  relatedImage: { width: 100, height: 100, borderRadius: 50 },
  relatedName: { color: "#fff", marginTop: 6, fontWeight: "600" },
  relatedSubtitle: { color: "#aaa", fontSize: 12 },
});
