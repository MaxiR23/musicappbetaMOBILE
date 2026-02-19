import { ArtistSkeletonLayout } from "@/src/components/shared/skeletons/Skeleton";
import { useDetailScreen } from "@/src/hooks/use-detail-screen";
import { useMusic } from "@/src/hooks/use-music";
import { useMusicApi } from "@/src/hooks/use-music-api";
import { useLocalSearchParams, useRouter, useSegments } from "expo-router";
import React, { useMemo } from "react";
import { StatusBar, StyleSheet, Text, View } from "react-native";

import { mapArtistTopSongs } from "@/src/utils/song-mapper";

import NewReleaseCard from "@/src/components/features/home/NewReleaseCard";
import AnimatedHeader from "@/src/components/shared/AnimatedHeader";
import EventsList from "@/src/components/shared/EventList";
import HorizontalScrollSection from "@/src/components/shared/HorizontalScrollSection";
import TrackRow from "@/src/components/shared/TrackRow";
import { useContentPadding } from "@/src/hooks/use-content-padding";
import { normalizeRelatedArtists } from "@/src/utils/data-helpers";
import { getUpgradedThumb, upgradeThumbUrl } from "@/src/utils/image-helpers";
import { formatReleaseSubtitle } from "@/src/utils/subtitle-helpers";

export default function ArtistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { currentSong, playFromList } = useMusic();
  const { getArtist } = useMusicApi();
  const router = useRouter();
  const segments = useSegments();
  const contentPadding = useContentPadding();

  const currentTab = segments[1] as 'home' | 'search';

  const { data: artist, loading } = useDetailScreen({
    id,
    fetcher: getArtist,
  });

  const newRelease = artist?.newReleases?.[0];
  const upcomingReleases = artist?.upcoming_album ? [artist.upcoming_album] : [];

  const mappedTop = useMemo(() => {
    if (!artist) return [];
    return mapArtistTopSongs(artist.topSongs, {
      artistId: id ?? null,
      defaultArtistName: artist.header?.name,
    });
  }, [artist, id]);

  const related = useMemo(() => normalizeRelatedArtists(artist?.related), [artist]);

  // Array de sections
  const sections = useMemo(() => {
    if (!artist) return [];

    return [
      upcomingReleases.length > 0 && {
        type: 'upcoming',
        data: upcomingReleases,
      },
      newRelease && {
        type: 'newRelease',
        data: newRelease,
      },
      {
        type: 'topSongs',
        data: artist.topSongs,
      },
      artist.albums?.length > 0 && {
        type: 'albums',
        data: artist.albums,
      },
      Array.isArray(artist.singles_eps) && artist.singles_eps.length > 0 && {
        type: 'singles',
        data: artist.singles_eps,
      },
      artist.upcomingEvents?.length > 0 && {
        type: 'events',
        data: artist.upcomingEvents,
      },
      related.length > 0 && {
        type: 'related',
        data: related,
      },
    ].filter(Boolean);
  }, [artist, upcomingReleases, newRelease, related]);

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

  const heroUrl = getUpgradedThumb(artist?.header, 1200);

  const renderSection = (section: any) => {
    switch (section.type) {
      case 'upcoming':
        return (
          <View style={styles.upcomingSection}>
            {section.data.map((release: any, index: number) => (
              <NewReleaseCard
                key={`upcoming-${release.id || index}`}
                release={{
                  id: release.id,
                  title: release.album,
                  artist: release.artist,
                  release_date: release.release_date || "TBA",
                  track_count: release.track_count,
                  thumb: release.thumbnail,
                }}
                badgeText={release.is_tba ? "Próximamente" : "Estreno próximo"}
              />
            ))}
          </View>
        );

      case 'newRelease':
        return (
          <View style={{ marginBottom: 20 }}>
            <NewReleaseCard
              release={section.data}
              onPress={() => router.push(`/(tabs)/${currentTab}/album/${section.data.id}`)}
            />
          </View>
        );

      case 'topSongs':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Canciones Populares</Text>
            {section.data.map((song: any, index: number) => (
              <TrackRow
                key={`topsong-${song.id || song.videoId}-${index}`}
                index={index + 1}
                title={song.title}
                thumbnail={getUpgradedThumb(song, 256)}
                showDuration={false}
                showMoreButton={false}
                trackId={song.id}
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
        );

      case 'albums':
        return (
          <View style={{ marginBottom: 20 }}>
            <HorizontalScrollSection
              title="Álbumes"
              has_more={!!artist.has_more?.albums}
              items={section.data}
              keyExtractor={(album, idx) => `album-${album.id}-${idx}`}
              imageExtractor={(album) => getUpgradedThumb(album, 512)}
              titleExtractor={(album) => album.title}
              subtitleExtractor={(album) => album.year}
              onItemPress={(album) => router.push(`/(tabs)/${currentTab}/album/${album.id}`)}
              onPressMore={
                artist.has_more?.albums
                  ? () =>
                      router.push(
                        `/(tabs)/${currentTab}/artist/${id}/releases?tab=albums&name=${encodeURIComponent(
                          artist.header?.name || ""
                        )}`
                      )
                  : undefined
              }
            />
          </View>
        );

      case 'singles':
        return (
          <View style={{ marginBottom: 20 }}>
            <HorizontalScrollSection
              title="Singles / EPs"
              has_more={!!artist.has_more?.singles}
              items={section.data}
              keyExtractor={(single, idx) => `single-${single.id}-${idx}`}
              imageExtractor={(single) => getUpgradedThumb(single, 512)}
              titleExtractor={(single) => single.title}
              subtitleExtractor={(single) => formatReleaseSubtitle(single)}
              onItemPress={(single) => router.push(`/(tabs)/${currentTab}/album/${single.id}`)}
              onPressMore={
                artist.has_more?.singles
                  ? () =>
                      router.push(
                        `/(tabs)/${currentTab}/artist/${id}/releases?tab=singles&name=${encodeURIComponent(
                          artist.header?.name || ""
                        )}`
                      )
                  : undefined
              }
            />
          </View>
        );

      case 'events':
        return (
          <View style={{ marginBottom: 20 }}>
            <EventsList
              events={section.data}
              artistName={artist?.header?.name}
              title="Upcoming events"
              initialCount={3}
              maxCount={10}
            />
          </View>
        );

      case 'related':
        return (
          <View style={{ marginBottom: 20 }}>
            <HorizontalScrollSection
              title="Artistas Relacionados"
              items={section.data}
              keyExtractor={(rel, idx) => `related-${rel.id}-${idx}`}
              imageExtractor={(rel) => upgradeThumbUrl(rel.img, 256)}
              titleExtractor={(rel) => rel.name}
              subtitleExtractor={(rel) => rel.subtitle}
              onItemPress={(rel) => {
                if (String(rel.id) === String(id)) return;
                router.push(`/(tabs)/${currentTab}/artist/${rel.id}`);
              }}
              cardWidth={100}
              imageHeight={100}
              circularImage={true}
            />
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0e0e0e" />

      <AnimatedHeader
        backgroundImage={heroUrl}
        title={artist?.header?.name || ""}
        subtitle={artist?.header?.monthlyListeners}
        sections={sections}
        renderSection={renderSection}
        onBackPress={() => router.back()}
        headerHeight={400}
        collapsedHeight={100}
        contentPaddingHorizontal={0}
        contentContainerStyle={contentPadding}
      />
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },
  upcomingSection: {
    marginBottom: 20,
    paddingHorizontal: 0,
  },
});