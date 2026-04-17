import { useMusic } from "@/hooks/use-music";
import { getUpgradedThumb } from "@/utils/image-helpers";
import React from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import TrackRow from "../../../shared/TrackRow";
import { sharedTabStyles } from "./shared-tab-styles";

interface UpNextTabProps {
  upNextData: any;
  upNextLoading: boolean;
  upNextError: string | null;
  onUpNextTrackPress?: (track: any, isFromAutoplay: boolean) => void;
}

export const UpNextTab = React.memo(function UpNextTab({
  upNextData,
  upNextLoading,
  upNextError,
  onUpNextTrackPress,
}: UpNextTabProps) {
  const { t } = useTranslation("player");
  const { queue, queueIndex, playSource } = useMusic();

  if (upNextLoading) {
    return (
      <View style={sharedTabStyles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={sharedTabStyles.loadingText}>{t("upNext.loading")}</Text>
      </View>
    );
  }

  if (upNextError) {
    return <Text style={sharedTabStyles.errorText}>{upNextError}</Text>;
  }

  const queueIds = new Set(queue.map((s: any) => String(s.id)));

  const autoplaySuggestions: any[] =
    upNextData?.up_next && upNextData.up_next.length > 1
      ? upNextData.up_next.slice(1).filter(
          (track: any) => !queueIds.has(String(track.track_id || track.id))
        )
      : [];

  const hasNothing =
    queue.length <= queueIndex + 1 &&
    (!upNextData?.up_next || upNextData.up_next.length <= 1);

  return (
    <View>
      <View style={styles.playingFromHeader}>
        <Text style={styles.playingFromLabel}>{t("upNext.playingFrom")}</Text>
        <Text style={styles.playingFromName}>
          {playSource?.name || t("upNext.unknown")}
        </Text>
      </View>

      {queue.length > 0 && (
        <View style={styles.queueSection}>
          <FlatList
            data={queue}
            keyExtractor={(track: any, idx: number) => `queue-${track.id}-${idx}`}
            renderItem={({ item: track, index: idx }) => {
              const isCurrentTrack = idx === queueIndex;
              return (
                <TrackRow
                  trackId={track.id}
                  index={idx + 1}
                  title={track.title}
                  artist={track.artist_name || track.artist}
                  thumbnail={track.thumbnail}
                  showIndex={false}
                  showMoreButton={true}
                  track={track}
                  onPress={() => {
                    if (isCurrentTrack) return;
                    onUpNextTrackPress?.({ ...track, __queueIndex: idx }, false);
                  }}
                />
              );
            }}
            style={styles.trackList}
            scrollEnabled={false}
            initialNumToRender={12}
            maxToRenderPerBatch={12}
            windowSize={6}
            updateCellsBatchingPeriod={80}
            removeClippedSubviews
            onEndReachedThreshold={0.2}
          />
        </View>
      )}

      {autoplaySuggestions.length > 0 && (
        <View style={styles.queueSection}>
          <View style={styles.autoplayHeader}>
            <Text style={styles.queueSectionTitle}>{t("upNext.autoplay")}</Text>
            <Text style={styles.autoplaySubtitle}>{t("upNext.autoplayHint")}</Text>
          </View>

          <FlatList
            data={autoplaySuggestions}
            keyExtractor={(track: any, idx: number) =>
              `autoplay-${track.track_id ?? track.id}-${idx}`
            }
            renderItem={({ item: track, index: idx }) => (
              <TrackRow
                trackId={track.track_id}
                index={idx + 1}
                title={track.title}
                artist={track.artists?.map((a: any) => a.name).join(", ")}
                thumbnail={getUpgradedThumb(track, 512)}
                showIndex={false}
                showMoreButton={true}
                track={track}
                onPress={() => onUpNextTrackPress?.(track, true)}
              />
            )}
            style={styles.trackList}
            scrollEnabled={false}
            initialNumToRender={12}
            maxToRenderPerBatch={12}
            windowSize={6}
            updateCellsBatchingPeriod={80}
            removeClippedSubviews
            onEndReachedThreshold={0.2}
          />
        </View>
      )}

      {hasNothing && (
        <View style={sharedTabStyles.errorContainer}>
          <Text style={sharedTabStyles.placeholderText}>{t("upNext.noTracks")}</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  playingFromHeader: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    marginBottom: 8,
  },
  playingFromLabel: {
    color: "#888",
    fontSize: 12,
    marginBottom: 4,
  },
  playingFromName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  trackList: {
    paddingTop: 8,
  },
  queueSection: {
    marginBottom: 24,
  },
  queueSectionTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    paddingHorizontal: 12,
    marginBottom: 12,
    marginTop: 8,
  },
  autoplayHeader: {
    marginBottom: 12,
  },
  autoplaySubtitle: {
    color: "#888",
    fontSize: 12,
    paddingHorizontal: 12,
    marginTop: 4,
  },
});