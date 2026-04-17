import HorizontalScrollSection from "@/components/shared/HorizontalScrollSection";
import { getUpgradedThumb } from "@/utils/image-helpers";
import React from "react";
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

  if (!Array.isArray(relatedData) || relatedData.length === 0) {
    return (
      <View style={sharedTabStyles.errorContainer}>
        <Text style={sharedTabStyles.placeholderText}>{t("related.noContent")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.relatedContent}>
      {relatedData.map((section: any, sIdx: number) => {
        const sectionKey = `section-${section.title || ""}-${sIdx}`;
        const sectionType = resolveSectionType(section);
        const contents: any[] = section?.contents || [];

        if (!Array.isArray(contents) || contents.length === 0) return null;

        if (sectionType === "songs") {
          return (
            <View key={sectionKey} style={styles.relatedSection}>
              <Text style={styles.relatedSectionTitle}>{section.title}</Text>
              <FlatList
                data={contents}
                keyExtractor={(track: any, i: number) =>
                  `related-song-${sIdx}-${track.track_id || track.id || i}`
                }
                renderItem={({ item: track, index: tIdx }) => (
                  <TrackRow
                    trackId={track.track_id}
                    index={tIdx + 1}
                    title={track.title}
                    artist={track.artists?.map((a: any) => a.name).join(", ")}
                    thumbnail={getUpgradedThumb(track, 512)}
                    showIndex={false}
                    showMoreButton={true}
                    track={track}
                    onPress={() => onRelatedTrackPress?.(track)}
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
          );
        }

        if (sectionType === "artists") {
          return (
            <View key={sectionKey} style={styles.relatedSection}>
              <HorizontalScrollSection
                title={section.title}
                items={contents}
                keyExtractor={(a: any, i: number) => `artist-${sIdx}-${a.artist_id ?? i}`}
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

        if (sectionType === "albums") {
          return (
            <View key={sectionKey} style={styles.relatedSection}>
              <HorizontalScrollSection
                title={section.title}
                items={contents}
                keyExtractor={(al: any, i: number) => `album-${sIdx}-${al.album_id ?? i}`}
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
        }

        return null;
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  relatedContent: {
    paddingTop: 8,
  },
  relatedSection: {
    marginBottom: 32,
  },
  relatedSectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  trackList: {
    paddingTop: 8,
  },
});