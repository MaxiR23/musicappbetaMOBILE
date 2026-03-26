import PlaybackButtons from "@/components/features/player/PlaybackButtons";
import AnimatedDetailHeader from "@/components/shared/AnimatedDetailHeader";
import TrackRow from "@/components/shared/TrackRow";
import { PlaylistSkeletonLayout } from "@/components/shared/skeletons/Skeleton";
import { useContentPadding } from "@/hooks/use-content-padding";
import { useMusic } from "@/hooks/use-music";
import { useReplay } from "@/hooks/use-replay";
import { formatDurationCustom } from "@/utils/durations";
import { MappedSong } from "@/utils/song-mapper";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";

export default function ReplayScreen() {
  const router = useRouter();
  const contentPadding = useContentPadding();
  const { songs, loading } = useReplay();
  const { playList } = useMusic();
  const { t } = useTranslation("replay");

  const mosaicImages = useMemo(
    () => songs.map((s) => s.thumbnail).filter(Boolean) as string[],
    [songs]
  );

  const totalDuration = useMemo(() => {
    const totalMs = songs.reduce(
      (acc, s) => acc + (s.duration_seconds ?? 0) * 1000, 0
    );
    return formatDurationCustom(totalMs, { format: "compact", round: true });
  }, [songs]);

  const sections = useMemo(() => {
    if (!songs.length) return [];
    return [
      { type: "info" },
      { type: "buttons" },
      ...songs.map((song, index) => ({ type: "track", data: song, index })),
    ];
  }, [songs]);

  const handlePlayAll = () => {
    if (!songs.length) return;
    playList(songs, 0, { type: "queue", name: "Replay" });
  };

  const handleShuffleAll = () => {
    if (!songs.length) return;
    const shuffled = [...songs].sort(() => Math.random() - 0.5);
    playList(shuffled, 0, { type: "queue", name: "Replay" });
  };

  const handleTrackPress = (index: number) => {
    playList(songs, index, { type: "queue", name: "Replay" });
  };

  const renderSection = (section: any) => {
    switch (section.type) {
      case "info":
        return (
          <View style={styles.infoSection}>
            <Text style={styles.title}>{t("title")}</Text>
            <Text style={styles.meta}>
              {t("meta.songCount", { count: songs.length })} • {totalDuration}
            </Text>
          </View>
        );
      case "buttons":
        return <PlaybackButtons onPlay={handlePlayAll} onShuffle={handleShuffleAll} />;
      case "track":
        const song: MappedSong = section.data;
        return (
          <View style={{ paddingHorizontal: 16 }}>
            <TrackRow
              index={section.index + 1}
              title={song.title}
              artist={song.artist_name}
              thumbnail={song.thumbnail}
              trackId={song.id}
              showIndex={false}
              showMoreButton={true}
              track={song}
              onPress={() => handleTrackPress(section.index)}
            />
          </View>
        );
      default:
        return null;
    }
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

  return (
    <>
      <StatusBar barStyle="light-content" />
      <AnimatedDetailHeader
        mosaicImages={mosaicImages}
        title="Replay"
        sections={sections}
        renderSection={renderSection}
        onBackPress={() => router.back()}
        contentContainerStyle={contentPadding}
      />
    </>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#0e0e0e",
  },
  infoSection: {
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
  },
  meta: {
    fontSize: 13,
    color: "#888",
  },
});