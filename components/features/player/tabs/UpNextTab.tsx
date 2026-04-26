import { useMusic } from "@/hooks/use-music";
import { getUpgradedThumb } from "@/utils/image-helpers";
import React, { useCallback, useMemo } from "react";
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

type ListItem =
  | { kind: "playing_from"; name: string }
  | { kind: "autoplay_header" }
  | { kind: "queue_track"; track: any; index: number; isCurrent: boolean }
  | { kind: "autoplay_track"; track: any };

export const UpNextTab = React.memo(function UpNextTab({
  upNextData,
  upNextLoading,
  upNextError,
  onUpNextTrackPress,
}: UpNextTabProps) {
  const { t } = useTranslation("player");
  const { queue, queueIndex, playSource } = useMusic();

  const items = useMemo<ListItem[]>(() => {
    const out: ListItem[] = [];

    out.push({
      kind: "playing_from",
      name: playSource?.name || t("upNext.unknown"),
    });

    queue.forEach((track: any, idx: number) => {
      out.push({
        kind: "queue_track",
        track,
        index: idx,
        isCurrent: idx === queueIndex,
      });
    });

    const queueIds = new Set(queue.map((s: any) => String(s.id)));
    const autoplaySuggestions: any[] =
      upNextData?.up_next && upNextData.up_next.length > 1
        ? upNextData.up_next
            .slice(1)
            .filter((tr: any) => !queueIds.has(String(tr.track_id || tr.id)))
        : [];

    if (autoplaySuggestions.length > 0) {
      out.push({ kind: "autoplay_header" });
      autoplaySuggestions.forEach((track: any) => {
        out.push({ kind: "autoplay_track", track });
      });
    }

    return out;
  }, [queue, queueIndex, playSource?.name, upNextData, t]);

  const keyExtractor = useCallback((item: ListItem, idx: number) => {
    switch (item.kind) {
      case "playing_from":
        return "header-playing-from";
      case "autoplay_header":
        return "header-autoplay";
      case "queue_track":
        return `queue-${item.track.id}-${item.index}`;
      case "autoplay_track":
        return `autoplay-${item.track.track_id ?? item.track.id}-${idx}`;
    }
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.kind === "playing_from") {
        return (
          <View style={styles.playingFromHeader}>
            <Text style={styles.playingFromLabel}>{t("upNext.playingFrom")}</Text>
            <Text style={styles.playingFromName}>{item.name}</Text>
          </View>
        );
      }

      if (item.kind === "autoplay_header") {
        return (
          <View style={styles.autoplayHeader}>
            <Text style={styles.queueSectionTitle}>{t("upNext.autoplay")}</Text>
            <Text style={styles.autoplaySubtitle}>{t("upNext.autoplayHint")}</Text>
          </View>
        );
      }

      if (item.kind === "queue_track") {
        const { track, index, isCurrent } = item;
        return (
          <TrackRow
            trackId={track.id}
            index={index + 1}
            title={track.title}
            artist={track.artist_name || track.artist}
            thumbnail={track.thumbnail}
            showIndex={false}
            showMoreButton
            track={track}
            onPress={() => {
              if (isCurrent) return;
              onUpNextTrackPress?.({ ...track, __queueIndex: index }, false);
            }}
          />
        );
      }

      const { track } = item;
      return (
        <TrackRow
          trackId={track.track_id}
          title={track.title}
          artist={track.artists?.map((a: any) => a.name).join(", ")}
          thumbnail={getUpgradedThumb(track, 512)}
          showIndex={false}
          showMoreButton
          track={track}
          onPress={() => onUpNextTrackPress?.(track, true)}
        />
      );
    },
    [t, onUpNextTrackPress]
  );

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

  const onlyHeader = items.length === 1 && items[0].kind === "playing_from";
  if (onlyHeader) {
    return (
      <View style={sharedTabStyles.errorContainer}>
        <Text style={sharedTabStyles.placeholderText}>{t("upNext.noTracks")}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      initialNumToRender={10}
      maxToRenderPerBatch={8}
      windowSize={7}
      updateCellsBatchingPeriod={50}
      removeClippedSubviews
      showsVerticalScrollIndicator
    />
  );
});

const styles = StyleSheet.create({
  listContent: {
    paddingTop: 8,
    paddingBottom: 40,
    paddingHorizontal: 14,
  },
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
    marginTop: 16,
  },
  autoplaySubtitle: {
    color: "#888",
    fontSize: 12,
    paddingHorizontal: 12,
    marginTop: 4,
  },
});