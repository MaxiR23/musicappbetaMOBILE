// app/album/[id].tsx
import TrackActionsSheet from "@/src/components/TrackActionsSheet";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { AlbumSkeletonLayout } from "../../src/components/skeletons/Skeleton";
import { useDetailScreen } from "../../src/hooks/use-detail-screen";
import { useMusic } from "../../src/hooks/use-music";
import { useMusicApi } from "../../src/hooks/use-music-api";

import { mapAlbumTracks } from "@/src/utils/song-mapper";

import HeroSection from "@/src/components/HeroSection";
import HorizontalScrollSection from "@/src/components/HorizontalScrollSection";
import PlaybackButtons from "@/src/components/PlaybackButtons";
import TrackRow from "@/src/components/TrackRow";

export default function AlbumScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { playFromList, currentSong } = useMusic();
  const { getAlbum } = useMusicApi();
  const router = useRouter();

  const [actionsOpen, setActionsOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<any | null>(null);

  //hook que maneja la carga del álbum
  const { data: album, loading } = useDetailScreen({
    id,
    fetcher: getAlbum,
  });

  const coverUrl =
    album?.info?.thumbnails?.[album?.info?.thumbnails?.length - 1]?.url ||
    album?.info?.thumbnails?.[0]?.url ||
    "";

  const mappedSongs = useMemo(() => {
    if (!album) return [];
    return mapAlbumTracks(album.tracks, {
      albumId: id ?? null,
      defaultThumbnail: coverUrl,
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

  const artistThumbUrl =
    album?.info?.straplineThumbnail?.[0]?.url ||
    album?.info?.thumbnails?.[0]?.url ||
    "";

  const artistNames =
    (album?.info?.includedArtists?.length
      ? (album.info.includedArtists as any[])
        .map(a => a?.name)
        .filter(Boolean)
      : (album?.info?.artistName ? [album.info.artistName] : [])
    ).join(", ");

  const hasTracks = !!(album?.tracks && album.tracks.length > 0);

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
        <HeroSection backgroundImage={coverUrl} height={320} blurRadius={50}>
          <View style={styles.heroCoverWrap}>
            <Image source={{ uri: coverUrl }} style={styles.heroCover} />
          </View>
        </HeroSection>

        {/* Info debajo del hero */}
        <View style={styles.infoBlock}>
          <Text style={styles.albumTitle}>{album.info?.title}</Text>

          {/* NUEVO: mini avatar + nombres de artista(s) */}
          {!!artistNames && (
            <View style={styles.artistRow}>
              {!!artistThumbUrl && (
                <Image source={{ uri: artistThumbUrl }} style={styles.artistAvatar} />
              )}
              <Text style={styles.artistName}>{artistNames}</Text>
            </View>
          )}

          {!!albumMeta && <Text style={styles.albumMeta}>{albumMeta}</Text>}
          {!!album.info?.subtitle && <Text style={styles.albumSubtitle}>{album.info?.subtitle}</Text>}
          {!!album.info?.secondSubtitle && <Text style={styles.albumSubtitle}>{album.info?.secondSubtitle}</Text>}
        </View>

        {/* Botones */}
        {hasTracks && (
          <PlaybackButtons
            onPlay={() =>
              playFromList(mappedSongs, 0, {
                type: "album",
                name: album.info?.title,
                thumb: coverUrl,
              })
            }
            onShuffle={() => {
              const randomIndex = Math.floor(Math.random() * mappedSongs.length);
              playFromList(mappedSongs, randomIndex, {
                type: "album",
                name: album.info?.title,
                thumb: coverUrl,
              });
            }}
          />
        )}

        {/* Songs */}
        <View style={styles.section}>
          {hasTracks ? (
            album.tracks.map((song: any, index: number) => (
              <TrackRow
                key={`${song.id || "track"}-${index}`}
                index={index + 1}
                title={song.title}
                artist={song.artists?.map((a: any) => a.name).join(", ")}
                showThumbnail={false}
                onPress={() =>
                  playFromList(mappedSongs, index, {
                    type: "album",
                    name: album.info?.title,
                    thumb: coverUrl,
                  })
                }
                onMorePress={() => {
                  setSelectedTrack(mappedSongs[index]);
                  setActionsOpen(true);
                }}
              />
            ))
          ) : (
            <Text style={[styles.songArtists, { marginTop: 8 }]}>
              Songs unavailable for this release.
            </Text>
          )}
        </View>

        {/* Upcoming event */}
        {!!album.upcomingEvents?.length && (() => {
          const ev = album.upcomingEvents[0];
          const artistName =
            album?.info?.artistName ||
            album?.info?.artists?.[0]?.name ||
            "";

          const isFestival =
            /fest(ival)?/i.test(ev?.name || "") || (ev?.attractions?.length || 0) >= 4;

          // supporters/openers: attractions menos la artista principal (case-insensitive)
          const openers = (ev?.attractions || []).filter((a: any) =>
            artistName ? (a?.name || "").toLowerCase() !== artistName.toLowerCase() : true
          );

          const whenLocal = ev?.start?.localDate
            ? `${ev.start.localDate}${ev.start.localTime ? " " + ev.start.localTime : ""}`
            : "TBA";

          const venueLine = [ev?.venue?.name, ev?.venue?.city, ev?.venue?.country]
            .filter(Boolean)
            .join(" • ");

          const mapUrl =
            ev?.venue?.lat && ev?.venue?.lon
              ? `https://maps.google.com/?q=${ev.venue.lat},${ev.venue.lon}`
              : undefined;

          const poster = ev?.image || album?.info?.thumbnails?.[0]?.url || "";

          return (
            <View style={{ paddingHorizontal: 16, marginTop: 8, gap: 10 }}>
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 6 }}>
                Upcoming event
              </Text>

              <TouchableOpacity
                disabled
                activeOpacity={0.9}
                style={{
                  backgroundColor: "#151515",
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: "#222",
                  overflow: "hidden"
                }}
              >
                {!!poster && (
                  <Image source={{ uri: poster }} style={{ width: "100%", height: 160 }} />
                )}
                <View style={{ padding: 12 }}>
                  <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }} numberOfLines={2}>
                    {ev?.name}
                  </Text>

                  {/* Fecha + hora (con ícono calendario) */}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <Ionicons name="calendar-outline" size={14} color="#bbb" />
                    <Text style={{ color: "#bbb" }}>
                      {whenLocal} {ev?.start?.timezone ? `• ${ev.start.timezone}` : ""}
                    </Text>
                  </View>

                  {/* Lugar (con ícono ubicación) */}
                  {!!venueLine && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                      <Ionicons name="location-outline" size={14} color="#bbb" />
                      <Text style={{ color: "#bbb", flexShrink: 1 }}>{venueLine}</Text>
                    </View>
                  )}

                  {/* Seatmap / Map links */}
                  {(isFestival ? (ev?.attractions?.length > 0) : (openers.length > 0)) && (
                    <View style={{ marginTop: 10 }}>
                      <Text style={{ color: "#fff", fontWeight: "700", marginBottom: 6 }}>
                        {isFestival ? "Lineup" : "With"}
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} onStartShouldSetResponderCapture={() => true}>
                        {(isFestival ? ev.attractions : openers).slice(0, 12).map((a: any, i: number) => (
                          <View
                            key={`${a.id || a.name}-${i}`}
                            style={{
                              paddingVertical: 6,
                              paddingHorizontal: 10,
                              borderRadius: 14,
                              backgroundColor: "#1e1e1e",
                              borderWidth: 1,
                              borderColor: "#2a2a2a",
                              marginRight: 8
                            }}
                          >
                            <Text style={{ color: "#ddd", fontSize: 12 }}>{a.name}</Text>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          );
        })()}

        {/* Other versions */}
        {!!album.otherVersions?.length && (
          <HorizontalScrollSection
            title="Other versions"
            items={album.otherVersions}
            keyExtractor={(it, i) => `ov-${i}-${it.browseId || it.title}`}
            imageExtractor={(it) =>
              it.thumbnails?.[it.thumbnails.length - 1]?.url ||
              it.thumbnails?.[0]?.url ||
              coverUrl
            }
            titleExtractor={(it) => it.title}
            subtitleExtractor={(it) =>
              `${it.type}${it.artistName ? ` • ${it.artistName}` : ""}`
            }
            onItemPress={(it) => router.push(`/album/${it.browseId}`)}
          />
        )}

        {/* More from artist */}
        {!!album.moreFromArtist?.length && (
          <HorizontalScrollSection
            title="More from artist"
            items={album.moreFromArtist}
            keyExtractor={(it, i) => `mfa-${i}-${it.id || it.title}`}
            imageExtractor={(it) =>
              it.thumbnails?.[it.thumbnails.length - 1]?.url ||
              it.thumbnails?.[0]?.url ||
              coverUrl
            }
            titleExtractor={(it) => it.title}
            subtitleExtractor={(it) =>
              `${it.type || "Album"}${it.year ? ` • ${it.year}` : ""}`
            }
            onItemPress={(it) => router.push(`/album/${it.id}`)}
          />
        )}

        {/* Releases for you */}
        {!!album.releasesForYou?.length && (
          <HorizontalScrollSection
            title="Releases for you"
            items={album.releasesForYou}
            keyExtractor={(it, i) => `rfy-${i}-${it.browseId || it.title}`}
            imageExtractor={(it) =>
              it.thumbnails?.[it.thumbnails.length - 1]?.url ||
              it.thumbnails?.[0]?.url ||
              coverUrl
            }
            titleExtractor={(it) => it.title}
            subtitleExtractor={(it) =>
              `${it.type || "Release"}${it.artistName ? ` • ${it.artistName}` : ""}`
            }
            onItemPress={(it) => {
              const route =
                (it.type || "").toLowerCase() === "playlist"
                  ? `/playlist/${it.browseId}`
                  : `/album/${it.browseId}`;
              router.push(route);
            }}
          />
        )}

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
  heroCoverWrap: {
    alignSelf: "center",
    marginBottom: 18,
    borderRadius: 14,
    overflow: "hidden",
    // sombra
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },

  heroCover: { width: 220, height: 220, borderRadius: 14, resizeMode: "cover" },

  infoBlock: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  albumTitle: { fontSize: 28, fontWeight: "bold", color: "#fff" },

  artistRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  artistAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#333",
  },
  artistName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  albumMeta: { fontSize: 13, color: "#bbb", marginTop: 6 },
  albumSubtitle: { fontSize: 14, color: "#ccc", marginTop: 2 },

  section: { paddingHorizontal: 16, marginTop: 8 },
  songRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  skeletonBox: { backgroundColor: "#2a2a2a", borderRadius: 8, opacity: 0.6 },
  skeletonLine: { backgroundColor: "#2a2a2a", borderRadius: 4, opacity: 0.6 },
});