// app/artist/[id]/index.tsx
import { ArtistSkeletonLayout } from "@/src/components/shared/skeletons/Skeleton";
import { useDetailScreen } from "@/src/hooks/use-detail-screen";
import { useMusic } from "@/src/hooks/use-music";
import { useMusicApi } from "@/src/hooks/use-music-api";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import { StatusBar, StyleSheet, Text, View } from "react-native";

import { mapArtistTopSongs } from "@/src/utils/song-mapper";

import NewReleaseCard from "@/src/components/features/home/NewReleaseCard";
import EventsList from "@/src/components/shared/EventList";
import HeroSection from "@/src/components/shared/HeroSection";
import HorizontalScrollSection from "@/src/components/shared/HorizontalScrollSection";
import ProList from "@/src/components/shared/ProList";
import TrackRow from "@/src/components/shared/TrackRow";
import { normalizeRelatedArtists } from "@/src/utils/data-helpers";
import { getUpgradedThumb, upgradeThumbUrl } from "@/src/utils/image-helpers";
import { formatReleaseSubtitle } from "@/src/utils/subtitle-helpers";

export default function ArtistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { currentSong, playFromList } = useMusic();
  const { getArtist } = useMusicApi();
  const router = useRouter();

  //hook que maneja la carga del artista
  const { data: artist, loading } = useDetailScreen({
    id,
    fetcher: getArtist,
  });

  //DBG: {
  /* React.useEffect(() => {
    if (artist) {
      console.log((id));
    }
  }, [artist]); */
  //DBG: }

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

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0e0e0e" />
      <ProList
        style={styles.container}
        contentContainerStyle={{
          paddingTop: 0,
          paddingBottom: currentSong ? 150 : 80,
        }}
        showsVerticalScrollIndicator={false}
        blockSize={2}
        initialBlocks={2}
        onEndReachedThreshold={0.5}
      >
        {/* Hero */}
        <View style={{ marginBottom: 20 }}>
          <HeroSection
            backgroundImage={heroUrl}
            height={400}
            useDirectImage={true}
            paddingBottom={0}
          >
            <View style={styles.heroInfo}>
              <Text style={styles.artistName}>{artist?.header?.name}</Text>
              <Text style={styles.listeners}>{artist?.header?.monthlyListeners}</Text>
            </View>
          </HeroSection>
        </View>

        {/* Upcoming Releases */}
        {upcomingReleases.length > 0 && (
          <View style={styles.upcomingSection}>
            {upcomingReleases.map((release: any, index: number) => (
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
        )}

        {/* Nuevo lanzamiento */}
        {newRelease && (
          <NewReleaseCard
            release={newRelease}
            onPress={() => router.push(`/(tabs)/home/album/${newRelease.id}`)}
          />
        )}

        {/* Top Songs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Canciones Populares</Text>
          {artist.topSongs.map((song: any, index: number) => (
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

        {/* Albums */}
        <HorizontalScrollSection
          title="Álbumes"
          has_more={!!artist.has_more?.albums}
          items={artist.albums}
          keyExtractor={(album, idx) => `album-${album.id}-${idx}`}
          imageExtractor={(album) => getUpgradedThumb(album, 512)}
          titleExtractor={(album) => album.title}
          subtitleExtractor={(album) => album.year}
          onItemPress={(album) => router.push(`/(tabs)/home/album/${album.id}`)}
          onPressMore={
            artist.has_more?.albums
              ? () =>
                router.push(
                  `/(tabs)/home/artist/${id}/releases?tab=albums&name=${encodeURIComponent(
                    artist.header?.name || ""
                  )}`
                )
              : undefined
          }
        />

        {/* Singles / EPs */}
        {Array.isArray(artist.singles_eps) && artist.singles_eps.length > 0 && (
          <HorizontalScrollSection
            title="Singles / EPs"
            has_more={!!artist.has_more?.singles}
            items={artist.singles_eps}
            keyExtractor={(single, idx) => `single-${single.id}-${idx}`}
            imageExtractor={(single) => getUpgradedThumb(single, 512)}
            titleExtractor={(single) => single.title}
            subtitleExtractor={(single) => formatReleaseSubtitle(single)}
            onItemPress={(single) => router.push(`/(tabs)/home/album/${single.id}`)}
            onPressMore={
              artist.has_more?.singles
                ? () =>
                  router.push(
                    `/(tabs)/home/artist/${id}/releases?tab=singles&name=${encodeURIComponent(
                      artist.header?.name || ""
                    )}`
                  )
                : undefined
            }
          />
        )}

        {/* Upcoming events */}
        <EventsList
          events={artist?.upcomingEvents || []}
          artistName={artist?.header?.name}
          title="Upcoming events"
          initialCount={3}
          maxCount={10}
        />

        {/* Related */}
        {related.length > 0 && (
          <HorizontalScrollSection
            title="Artistas Relacionados"
            items={related}
            keyExtractor={(rel, idx) => `related-${rel.id}-${idx}`}
            imageExtractor={(rel) => upgradeThumbUrl(rel.img, 256)}
            titleExtractor={(rel) => rel.name}
            subtitleExtractor={(rel) => rel.subtitle}
            onItemPress={(rel) => {
              if (String(rel.id) === String(id)) return;
              router.push(`/(tabs)/home/artist/${rel.id}`);
            }}
            cardWidth={100}
            imageHeight={100}
            circularImage={true}
          />
        )}
      </ProList>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0e0e0e" },

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

  // Hero
  heroInfo: { position: "absolute", bottom: 4, left: 20 },
  artistName: { fontSize: 26, fontWeight: "bold", color: "#fff", marginTop: 4 },
  listeners: { fontSize: 14, color: "#ccc" },
});