import HorizontalScrollSection from "@/components/shared/HorizontalScrollSection";
import { getUpgradedThumb } from "@/utils/image-helpers";
import React, { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import TrackRow from "../../../shared/TrackRow";
import { sharedTabStyles } from "./shared-tab-styles";

interface RelatedTabProps {
  relatedData: any;
  relatedLoading: boolean;
  relatedError: string | null;
  onRelatedTrackPress?: (track: any) => void;
  onRelatedArtistPress?: (artist_id: string) => void;
  onRelatedAlbumPress?: (album_id: string) => void;
}

type SectionType = "songs" | "artists" | "albums" | "unknown";

type ListItem =
  | { kind: "section_header"; title: string; sectionIdx: number }
  | { kind: "track"; track: any; sectionIdx: number; trackIdx: number }
  | { kind: "artists_row"; title: string; items: any[]; sectionIdx: number }
  | { kind: "albums_row"; title: string; items: any[]; sectionIdx: number };

function getSectionType(section: any): SectionType {
  const title = section?.title?.toLowerCase() || "";

  if (title.includes("song") || title.includes("track")) return "songs";
  if (title.includes("artist")) return "artists";
  if (title.includes("album")) return "albums";

  const firstItem = section?.contents?.[0];
  if (firstItem) {
    if (firstItem.track_id || firstItem.duration) return "songs";
    if (firstItem.artist_id) return "artists";
    if (firstItem.album_id) return "albums";
  }

  return "unknown";
}

function resolveSectionType(section: any): SectionType {
  if (section.section_type === "tracks") return "songs";
  if (section.section_type === "artists") return "artists";
  if (section.section_type === "albums") return "albums";
  return getSectionType(section);
}

export const RelatedTab = React.memo(function RelatedTab({
  relatedData,
  relatedLoading,
  relatedError,
  onRelatedTrackPress,
  onRelatedArtistPress,
  onRelatedAlbumPress,
}: RelatedTabProps) {
  const { t } = useTranslation("player");

  const items = useMemo<ListItem[]>(() => {
    if (!Array.isArray(relatedData)) return [];

    const out: ListItem[] = [];

    relatedData.forEach((section: any, sIdx: number) => {
      const contents: any[] = section?.contents || [];
      if (!Array.isArray(contents) || contents.length === 0) return;

      const sectionType = resolveSectionType(section);

      if (sectionType === "songs") {
        out.push({
          kind: "section_header",
          title: section.title || "",
          sectionIdx: sIdx,
        });
        contents.forEach((track: any, tIdx: number) => {
          out.push({ kind: "track", track, sectionIdx: sIdx, trackIdx: tIdx });
        });
        return;
      }

      if (sectionType === "artists") {
        out.push({
          kind: "artists_row",
          title: section.title || "",
          items: contents,
          sectionIdx: sIdx,
        });
        return;
      }

      if (sectionType === "albums") {
        out.push({
          kind: "albums_row",
          title: section.title || "",
          items: contents,
          sectionIdx: sIdx,
        });
        return;
      }
    });

    return out;
  }, [relatedData]);

  const keyExtractor = useCallback((item: ListItem) => {
    switch (item.kind) {
      case "section_header":
        return `header-${item.sectionIdx}-${item.title}`;
      case "track":
        return `track-${item.sectionIdx}-${item.track.track_id ?? item.track.id ?? item.trackIdx}`;
      case "artists_row":
        return `artists-${item.sectionIdx}`;
      case "albums_row":
        return `albums-${item.sectionIdx}`;
    }
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.kind === "section_header") {
        return <Text style={styles.relatedSectionTitle}>{item.title}</Text>;
      }

      if (item.kind === "track") {
        const { track, trackIdx } = item;
        return (
          <TrackRow
            trackId={track.track_id}
            index={trackIdx + 1}
            title={track.title}
            artist={track.artists?.map((a: any) => a.name).join(", ")}
            thumbnail={getUpgradedThumb(track, 512)}
            showIndex={false}
            showMoreButton
            track={track}
            onPress={() => onRelatedTrackPress?.(track)}
          />
        );
      }

      if (item.kind === "artists_row") {
        return (
          <View style={styles.relatedSection}>
            <HorizontalScrollSection
              title={item.title}
              items={item.items}
              keyExtractor={(a: any, i: number) =>
                `artist-${item.sectionIdx}-${a.artist_id ?? i}`
              }
              imageExtractor={(a: any) => getUpgradedThumb(a, 256)}
              titleExtractor={(a: any) => a.title || a.name}
              onItemPress={(a: any) => a.artist_id && onRelatedArtistPress?.(a.artist_id)}
              circularImage
              cardWidth={120}
              imageHeight={120}
              titleStyle={styles.relatedSectionTitle}
              contentPaddingHorizontal={12}
              gap={16}
              initialNumToRender={4}
              maxToRenderPerBatch={2}
              windowSize={3}
            />
          </View>
        );
      }

      return (
        <View style={styles.relatedSection}>
          <HorizontalScrollSection
            title={item.title}
            items={item.items}
            keyExtractor={(al: any, i: number) =>
              `album-${item.sectionIdx}-${al.album_id ?? i}`
            }
            imageExtractor={(al: any) => getUpgradedThumb(al, 512)}
            titleExtractor={(al: any) => al.title}
            subtitleExtractor={(al: any) =>
              al.year || al.artists?.map((a: any) => a.name).join(", ") || ""
            }
            onItemPress={(al: any) => al.album_id && onRelatedAlbumPress?.(al.album_id)}
            cardWidth={140}
            imageHeight={140}
            titleStyle={styles.relatedSectionTitle}
            contentPaddingHorizontal={12}
            gap={16}
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            windowSize={5}
          />
        </View>
      );
    },
    [onRelatedTrackPress, onRelatedArtistPress, onRelatedAlbumPress]
  );

  if (relatedLoading) {
    return (
      <View style={sharedTabStyles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={sharedTabStyles.loadingText}>{t("related.loading")}</Text>
      </View>
    );
  }

  if (relatedError) {
    return (
      <View style={sharedTabStyles.errorContainer}>
        <Text style={sharedTabStyles.errorText}>{relatedError}</Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={sharedTabStyles.errorContainer}>
        <Text style={sharedTabStyles.placeholderText}>{t("related.noContent")}</Text>
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
  relatedSection: {
    marginBottom: 32,
  },
  relatedSectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
});