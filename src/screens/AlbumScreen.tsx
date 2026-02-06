// app/album/[id].tsx
import { AlbumSkeletonLayout } from "@/src/components/shared/skeletons/Skeleton";
import TrackActionsSheet from "@/src/components/shared/TrackActionsSheet";
import { useDetailScreen } from "@/src/hooks/use-detail-screen";
import { useMusic } from "@/src/hooks/use-music";
import { useMusicApi } from "@/src/hooks/use-music-api";
import { useLocalSearchParams, useRouter, useSegments } from "expo-router";
import React, { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { mapAlbumTracks } from "@/src/utils/song-mapper";

import PlaybackButtons from "@/src/components/features/player/PlaybackButtons";
import AlbumInfo from "@/src/components/shared/AlbumInfo";
import AnimatedDetailHeader from "@/src/components/shared/AnimatedDetailHeader";
import EventCard from "@/src/components/shared/EventCard";
import HorizontalScrollSection from "@/src/components/shared/HorizontalScrollSection";
import TrackRow from "@/src/components/shared/TrackRow";
import { useContentPadding } from "@/src/hooks/use-content-padding";
import { extractIncludedArtists } from "@/src/utils/data-helpers";
import { getUpgradedThumb } from "@/src/utils/image-helpers";
import { formatAlbumMeta, formatReleaseSubtitle } from "@/src/utils/subtitle-helpers";

export default function AlbumScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();

    const { playFromList, currentSong } = useMusic();
    const { getAlbum } = useMusicApi();
    const router = useRouter();
    const segments = useSegments();
    const contentPadding = useContentPadding();

    const currentTab = segments[1] as 'home' | 'search';

    const [actionsOpen, setActionsOpen] = useState(false);
    const [selectedTrack, setSelectedTrack] = useState<any | null>(null);

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

    // Array de sections
    const sections = useMemo(() => {
        if (!album) return [];

        return [
            {
                type: 'info',
                data: {
                    title: album.info?.title,
                    artistName: artistNames,
                    artistThumb: artistThumbUrl,
                    meta: albumMeta,
                    subtitle: album.info?.subtitle,
                    secondSubtitle: album.info?.secondSubtitle,
                },
            },
            hasTracks && {
                type: 'playbackButtons',
                data: null,
            },
            hasTracks && {
                type: 'tracks',
                data: album.tracks,
            },
            album.upcomingEvents?.length > 0 && {
                type: 'upcomingEvent',
                data: album.upcomingEvents[0],
            },
            album.otherVersions?.length > 0 && {
                type: 'otherVersions',
                data: album.otherVersions,
            },
            album.moreFromArtist?.length > 0 && {
                type: 'moreFromArtist',
                data: album.moreFromArtist,
            },
            album.releasesForYou?.length > 0 && {
                type: 'releasesForYou',
                data: album.releasesForYou,
            },
        ].filter(Boolean);
    }, [album, albumMeta, artistNames, artistThumbUrl, hasTracks]);

    const needsExtraPadding = (album?.tracks?.length || 0) <= 3;

    if (loading || !album) {
        return (
            <View style={styles.container}>
                <AlbumSkeletonLayout
                    theme={{ baseColor: "#2a2a2a", highlightColor: "#3b3b3b", duration: 1200 }}
                    tracks={6}
                    heroHeight={360}
                />
            </View>
        );
    }

    const renderSection = (section: any) => {
        switch (section.type) {
            case 'info':
                return (
                    <AlbumInfo
                        title={section.data.title || ""}
                        artistName={section.data.artistName}
                        artistThumb={section.data.artistThumb}
                        meta={section.data.meta}
                        subtitle={section.data.subtitle}
                        secondSubtitle={section.data.secondSubtitle}
                    />
                );

            case 'playbackButtons':
                return (
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
                );

            case 'tracks':
                return (
                    <View style={styles.section}>
                        <FlatList
                            data={section.data}
                            keyExtractor={(song: any, index: number) =>
                                `${song.id || song.videoId || "track"}-${index}`
                            }
                            renderItem={({ item: song, index }) => (
                                <TrackRow
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
                            )}
                            scrollEnabled={false}
                            initialNumToRender={8}
                            maxToRenderPerBatch={8}
                            windowSize={6}
                            removeClippedSubviews
                        />
                    </View>
                );

            case 'upcomingEvent':
                return (
                    <View style={{ paddingHorizontal: 16, marginTop: 8, gap: 10 }}>
                        <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 6 }}>
                            Upcoming event
                        </Text>
                        <EventCard
                            event={section.data}
                            artistName={album?.info?.artistName || album?.info?.artists?.[0]?.name}
                            defaultPoster={coverUrl}
                            variant="featured"
                        />
                    </View>
                );

            case 'otherVersions':
                return (
                    <HorizontalScrollSection
                        title="Other versions"
                        items={section.data}
                        keyExtractor={(it, i) => `ov-${i}-${it.browseId || it.title}`}
                        imageExtractor={(it) => getUpgradedThumb(it, 512) || coverUrl}
                        titleExtractor={(it) => it.title}
                        subtitleExtractor={(it) => formatReleaseSubtitle(it)}
                        onItemPress={(it) => router.push(`/(tabs)/${currentTab}/album/${it.browseId}`)}
                    />
                );

            case 'moreFromArtist':
                return (
                    <HorizontalScrollSection
                        title="More from artist"
                        items={section.data}
                        keyExtractor={(it, i) => `mfa-${i}-${it.id || it.title}`}
                        imageExtractor={(it) => getUpgradedThumb(it, 512) || coverUrl}
                        titleExtractor={(it) => it.title}
                        subtitleExtractor={(it) => formatReleaseSubtitle({ ...it, type: it.type || "Album" })}
                        onItemPress={(it) => router.push(`/(tabs)/${currentTab}/album/${it.id}`)}
                    />
                );

            case 'releasesForYou':
                return (
                    <HorizontalScrollSection
                        title="Releases for you"
                        items={section.data}
                        keyExtractor={(it, i) => `rfy-${i}-${it.browseId || it.title}`}
                        imageExtractor={(it) => getUpgradedThumb(it, 512) || coverUrl}
                        titleExtractor={(it) => it.title}
                        subtitleExtractor={(it) => formatReleaseSubtitle({ ...it, type: it.type || "Release" })}
                        onItemPress={(it) => {
                            const route =
                                (it.type || "").toLowerCase() === "playlist"
                                    ? `/(tabs)/library/playlist/${it.browseId}`
                                    : `/(tabs)/${currentTab}/album/${it.browseId}`;
                            router.push(route);
                        }}
                    />
                );

            default:
                return null;
        }
    };

    return (
        <>
            <AnimatedDetailHeader
                coverImage={coverUrl}
                title={album.info?.title || ""}
                sections={sections}
                renderSection={renderSection}
                onBackPress={() => router.back()}
                contentContainerStyle={[
                    contentPadding,
                    needsExtraPadding && { paddingBottom: 100 }
                ]}
            />

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
    section: { paddingHorizontal: 16, marginTop: 8 },
});