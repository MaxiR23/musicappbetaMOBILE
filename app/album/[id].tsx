// app/album/[id].tsx
import TrackActionsSheet from "@/src/components/shared/TrackActionsSheet";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { AlbumSkeletonLayout } from "../../src/components/shared/skeletons/Skeleton";
import { useDetailScreen } from "../../src/hooks/use-detail-screen";
import { useMusic } from "../../src/hooks/use-music";
import { useMusicApi } from "../../src/hooks/use-music-api";

import { mapAlbumTracks } from "@/src/utils/song-mapper";

import PlaybackButtons from "@/src/components/features/player/PlaybackButtons";
import AlbumInfo from "@/src/components/shared/AlbumInfo";
import HeroSection from "@/src/components/shared/HeroSection";
import HorizontalScrollSection from "@/src/components/shared/HorizontalScrollSection";
import TrackRow from "@/src/components/shared/TrackRow";
import { extractIncludedArtists } from "@/src/utils/data-helpers";
import { getUpgradedThumb } from "@/src/utils/image-helpers";
import { formatAlbumMeta, formatReleaseSubtitle } from "@/src/utils/subtitle-helpers";
import EventCard from "../../src/components/shared/EventCard";

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

  const coverUrl = getUpgradedThumb(album?.info, 512) || "";

  const mappedSongs = useMemo(() => {
    if (!album) return [];
    return mapAlbumTracks(album.tracks, {
      albumId: id ?? null,
      defaultThumbnail: coverUrl,
    });
  }, [album, id, coverUrl]);

  const albumMeta = album?.info
    ? formatAlbumMeta({
      year: (album.info as any).year,
      songCount: (album.info as any).songCount,
      durationText: (album.info as any).durationText,
    })
    : "";

  const artistThumbUrl =
    album?.info?.straplineThumbnail?.[0]?.url ||
    getUpgradedThumb(album?.info, 256) || "";

  const artistNames = extractIncludedArtists(album?.info);

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
        <AlbumInfo
          title={album.info?.title || ""}
          artistName={artistNames}
          artistThumb={artistThumbUrl}
          meta={albumMeta}
          subtitle={album.info?.subtitle}
          secondSubtitle={album.info?.secondSubtitle}
        />

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
                trackId={song.videoId}
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
        {!!album.upcomingEvents?.length && (
          <View style={{ paddingHorizontal: 16, marginTop: 8, gap: 10 }}>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 6 }}>
              Upcoming event
            </Text>
            <EventCard
              event={album.upcomingEvents[0]}
              artistName={album?.info?.artistName || album?.info?.artists?.[0]?.name}
              defaultPoster={coverUrl}
              variant="featured"
            />
          </View>
        )}

        {/* Other versions */}
        {!!album.otherVersions?.length && (
          <HorizontalScrollSection
            title="Other versions"
            items={album.otherVersions}
            keyExtractor={(it, i) => `ov-${i}-${it.browseId || it.title}`}
            imageExtractor={(it) => getUpgradedThumb(it, 512) || coverUrl}
            titleExtractor={(it) => it.title}
            subtitleExtractor={(it) => formatReleaseSubtitle(it)}
            onItemPress={(it) => router.push(`/album/${it.browseId}`)}
          />
        )}

        {/* More from artist */}
        {!!album.moreFromArtist?.length && (
          <HorizontalScrollSection
            title="More from artist"
            items={album.moreFromArtist}
            keyExtractor={(it, i) => `mfa-${i}-${it.id || it.title}`}
            imageExtractor={(it) => getUpgradedThumb(it, 512) || coverUrl}
            titleExtractor={(it) => it.title}
            subtitleExtractor={(it) => formatReleaseSubtitle({ ...it, type: it.type || "Album" })}
            onItemPress={(it) => router.push(`/album/${it.id}`)}
          />
        )}

        {/* Releases for you */}
        {!!album.releasesForYou?.length && (
          <HorizontalScrollSection
            title="Releases for you"
            items={album.releasesForYou}
            keyExtractor={(it, i) => `rfy-${i}-${it.browseId || it.title}`}
            imageExtractor={(it) => getUpgradedThumb(it, 512) || coverUrl}
            titleExtractor={(it) => it.title}
            subtitleExtractor={(it) => formatReleaseSubtitle({ ...it, type: it.type || "Release" })}
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
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },

  heroCover: { width: 240, height: 240, borderRadius: 14, resizeMode: "cover" },
  section: { paddingHorizontal: 16, marginTop: 8 },
});