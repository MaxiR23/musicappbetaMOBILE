import { AlbumSkeletonLayout } from "@/components/shared/skeletons/Skeleton";
import TrackActionsSheet from "@/components/shared/TrackActionsSheet";
import { useDetailScreen } from "@/hooks/use-detail-screen";
import { useMusic } from "@/hooks/use-music";
import { useMusicApi } from "@/hooks/use-music-api";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { mapAlbumTracks } from "@/utils/song-mapper";

import PlaybackButtons from "@/components/features/player/PlaybackButtons";
import AlbumInfo from "@/components/shared/AlbumInfo";
import AnimatedDetailHeader from "@/components/shared/AnimatedDetailHeader";
import EventCard from "@/components/shared/EventCard";
import HorizontalScrollSection from "@/components/shared/HorizontalScrollSection";
import TrackRow from "@/components/shared/TrackRow";
import { useContentPadding } from "@/hooks/use-content-padding";
import { extractIncludedArtists } from "@/utils/data-helpers";
import { getUpgradedThumb } from "@/utils/image-helpers";
import { formatAlbumMeta, formatReleaseSubtitle } from "@/utils/subtitle-helpers";
import { useTranslation } from "react-i18next";

interface AlbumScreenProps {
  currentTab?: 'home' | 'search';
}

export default function AlbumScreen({ currentTab = 'home' }: AlbumScreenProps) {
    const { id } = useLocalSearchParams<{ id: string }>();

    const { playList } = useMusic();
    const { getAlbum } = useMusicApi();
    const router = useRouter();
    
    const contentPadding = useContentPadding();
    const { t } = useTranslation("album");
    const { t: tCommon } = useTranslation("common");

    const [actionsOpen, setActionsOpen] = useState(false);
    const [selectedTrack, setSelectedTrack] = useState<any | null>(null);

    const { data: album, loading, error } = useDetailScreen({
        id,
        fetcher: getAlbum,
    });

    const coverUrl = getUpgradedThumb(album?.info, 512) || "";

    const mappedSongs = useMemo(() => {
        if (!album) return [];
        return mapAlbumTracks(album.tracks, {
            defaultThumbnail: coverUrl,
        });
    }, [album, coverUrl]);

    const albumMeta = album?.info
        ? formatAlbumMeta({
            year: (album.info as any).year,
            song_count: (album.info as any).song_count,
            duration_text: (album.info as any).duration_text,
        }, tCommon)
        : "";

    const artistThumbUrl =
        album?.info?.strapline_thumbnail?.[0]?.url ||
        getUpgradedThumb(album?.info, 256) || "";

    const artist_names = extractIncludedArtists(album?.info);

    const hasTracks = !!(album?.tracks && album.tracks.length > 0);

    // Array de sections
    const sections = useMemo(() => {
        if (!album) return [];

        return [
            {
                type: 'info',
                data: {
                    title: album.info?.title,
                    artist_name: artist_names,
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
            album.upcoming_events?.length > 0 && {
                type: 'upcomingEvent',
                data: album.upcoming_events[0],
            },
            album.other_versions?.length > 0 && {
                type: 'otherVersions',
                data: album.other_versions,
            },
            album.more_from_artist?.length > 0 && {
                type: 'moreFromArtist',
                data: album.more_from_artist,
            },
            album.releases_for_you?.length > 0 && {
                type: 'releasesForYou',
                data: album.releases_for_you,
            },
        ].filter(Boolean);
    }, [album, albumMeta, artist_names, artistThumbUrl, hasTracks]);

    const needsExtraPadding = (album?.tracks?.length || 0) <= 3;

    if (loading) {
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

    if (error || !album) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', gap: 12 }]}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{tCommon("error.loadFailed")}</Text>
                <Text style={{ color: '#aaa', fontSize: 13 }}>{tCommon("error.retryHint")}</Text>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={{ color: '#1DB954', fontSize: 14, marginTop: 8 }}>{tCommon("error.goBack")}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const renderSection = (section: any) => {
        switch (section.type) {
            case 'info':
                return (
                    <AlbumInfo
                        title={section.data.title || ""}
                        artist_name={section.data.artist_name}
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
                            playList(mappedSongs, 0, {
                                type: "album",
                                name: album.info?.title,
                                thumb: coverUrl,
                            })
                        }
                        onShuffle={mappedSongs.length > 1 ? () => {
                            const randomIndex = Math.floor(Math.random() * mappedSongs.length);
                            playList(mappedSongs, randomIndex, {
                                type: "album",
                                name: album.info?.title,
                                thumb: coverUrl,
                            });
                        } : undefined}
                    />
                );

            case 'tracks':
                return (
                    <View style={styles.section}>
                        <FlatList
                            data={section.data}
                            keyExtractor={(song: any, index: number) =>
                                `${song.id || song.track_id || "track"}-${index}`
                            }
                            renderItem={({ item: song, index }) => (
                                <TrackRow
                                    index={index + 1}
                                    title={song.title}
                                    artist={song.artists?.map((a: any) => a.name).join(", ")}
                                    showThumbnail={false}
                                    trackId={song.track_id}
                                    disabled={!song.track_id}
                                    onPress={() =>
                                        playList(mappedSongs, index, {
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
                            {t("sections.upcomingEvent")}
                        </Text>
                        <EventCard
                            event={section.data}
                            artist_name={album?.info?.artist_name || album?.info?.artists?.[0]?.name}
                            defaultPoster={coverUrl}
                            variant="featured"
                        />
                    </View>
                );

            case 'otherVersions':
                return (
                    <HorizontalScrollSection
                        title={t("sections.otherVersions")}
                        items={section.data}
                        keyExtractor={(it, i) => `ov-${i}-${it.browseId || it.title}`}
                        imageExtractor={(it) => getUpgradedThumb(it, 512) || coverUrl}
                        titleExtractor={(it) => it.title}
                        subtitleExtractor={(it) => formatReleaseSubtitle(it)}
                        onItemPress={(it) => router.push(`/(tabs)/${currentTab}/album/${it.id}`)}
                    />
                );

            case 'moreFromArtist':
                return (
                    <HorizontalScrollSection
                        title={t("sections.moreFromArtist")}
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
                        title={t("sections.releasesForYou")}
                        items={section.data}
                        keyExtractor={(it, i) => `rfy-${i}-${it.browseId || it.title}`}
                        imageExtractor={(it) => getUpgradedThumb(it, 512) || coverUrl}
                        titleExtractor={(it) => it.title}
                        subtitleExtractor={(it) => formatReleaseSubtitle({ ...it, type: it.type || "Release" })}
                        onItemPress={(it) => {
                            const route = (it.type || "").toLowerCase() === "playlist"
                                ? `/(tabs)/library/playlist/${it.id}`
                                : `/(tabs)/${currentTab}/album/${it.id}`;
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
                    needsExtraPadding && { paddingBottom: 140 }
                ]}
            />

            <TrackActionsSheet
                open={actionsOpen}
                onOpenChange={setActionsOpen}
                track={selectedTrack}
                showGoToAlbum={false}
            />
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0e0e0e" },
    section: { paddingHorizontal: 16, marginTop: 8 },
});