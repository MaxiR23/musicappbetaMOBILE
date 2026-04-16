import PlaybackButtons from "@/components/features/player/PlaybackButtons";
import StationHeroHeader from "@/components/shared/StationHeroHeader";
import TrackActionsSheet from "@/components/shared/TrackActionsSheet";
import TrackRow from "@/components/shared/TrackRow";
import { PlaylistSkeletonLayout } from "@/components/shared/skeletons/Skeleton";
import { useContentPadding } from "@/hooks/use-content-padding";
import { useImageDominantColor } from "@/hooks/use-image-dominant-color";
import { useMusic } from "@/hooks/use-music";
import { useMusicApi } from "@/hooks/use-music-api";
import { upgradeThumbUrl } from "@/utils/image-helpers";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface StationScreenProps {
  artistId: string;
  initialName: string | null;
  initialThumb: string | null;
  tab: string;
}

export default function StationScreen({
  artistId,
  initialName,
  initialThumb,
  tab,
}: StationScreenProps) {
  const router = useRouter();
  const contentPadding = useContentPadding();
  const { t } = useTranslation("station");
  const { t: tCommon } = useTranslation("common");

  const { getArtistStation } = useMusicApi();
  const { playList } = useMusic();

  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<any | null>(null);

  const thumbUrl = upgradeThumbUrl(initialThumb ?? undefined, 2048);
  const { color: dominantColor } = useImageDominantColor(thumbUrl ?? null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!artistId) return;
      setLoading(true);
      setError(null);
      try {
        const data = await getArtistStation(artistId);
        if (mounted) {
          if (!data?.tracks?.length) {
            setError(t("error.empty"));
          } else {
            setTracks(data.tracks);
          }
        }
      } catch (err: any) {
        console.error("[station] error:", err);
        if (mounted) setError(t("error.loadFailed"));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [artistId, getArtistStation, t]);

  const sections = useMemo(() => {
    return [
      { type: "buttons", data: null },
      ...tracks.map((track: any, index: number) => ({ type: "track", data: track, index })),
    ];
  }, [tracks]);

  const handlePlayAll = () => {
    if (!tracks.length) return;
    playList(tracks as any, 0, {
      type: "station",
      id: artistId,
      name: initialName ?? "Station",
      thumb: initialThumb,
      station_artist_id: artistId,
    });
  };

  const handleTrackPress = (index: number) => {
    playList(tracks as any, index, {
      type: "station",
      id: artistId,
      name: initialName ?? "Station",
      thumb: initialThumb,
      station_artist_id: artistId,
    });
  };

  const handleTrackMorePress = (track: any) => {
    setSelectedTrack(track);
    setSheetOpen(true);
  };

  if (loading) {
    return (
      <ScrollView style={styles.page} contentContainerStyle={{ paddingBottom: 32 }}>
        <PlaylistSkeletonLayout
          theme={{ baseColor: "#2a2a2a", highlightColor: "#3b3b3b", duration: 1200 }}
          tracks={8}
          heroHeight={280}
        />
      </ScrollView>
    );
  }

  if (error) {
    return (
      <>
        <StatusBar barStyle="light-content" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#888" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.retryBtn}>
            <Text style={styles.retryText}>{tCommon("error.goBack")}</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const renderSection = (section: any) => {
    switch (section.type) {
      case "buttons":
        return <PlaybackButtons onPlay={handlePlayAll} />;

      case "track":
        return (
          <View style={{ paddingHorizontal: 16 }}>
            <TrackRow
              index={section.index + 1}
              title={section.data.title}
              artist={section.data.artist_name}
              thumbnail={section.data.thumbnail}
              trackId={section.data.id}
              showIndex={false}
              onPress={() => handleTrackPress(section.index)}
              onMorePress={() => handleTrackMorePress(section.data)}
            />
          </View>
        );

      default:
        return null;
    }
  };

  const heroTitle = t("meta.basedOn", { name: initialName ?? "" });
  const heroSubtitle = `${t("meta.label")} • ${t("meta.songCount", { count: tracks.length })}`;

  return (
    <>
      <StatusBar barStyle="light-content" />

      <StationHeroHeader
        coverImage={thumbUrl ?? undefined}
        dominantColor={dominantColor}
        title={heroTitle}
        heroTitle={heroTitle}
        heroSubtitle={heroSubtitle}
        sections={sections}
        renderSection={renderSection}
        onBackPress={() => router.back()}
        contentContainerStyle={contentPadding}
      />

      <TrackActionsSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        track={selectedTrack}
        showAddTo
        showGoToArtist
        showGoToAlbum
      />
    </>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#0e0e0e" },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
    backgroundColor: "#0e0e0e",
  },
  errorText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
    marginTop: 16,
  },
  retryBtn: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#1e1e1e",
    borderRadius: 8,
  },
  retryText: { color: "#fff", fontWeight: "600" },
});