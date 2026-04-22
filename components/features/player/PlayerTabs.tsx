import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import ProList from "@/components/shared/ProList";
import { useMusic } from "@/hooks/use-music";
import type { LyricLine } from "@/hooks/use-track-lyrics";
import { LyricsTab } from "./tabs/LyricsTab";
import { RelatedTab } from "./tabs/RelatedTab";
import { UpNextTab } from "./tabs/UpNextTab";

type TabType = "upnext" | "lyrics" | "related";

const TAB_I18N_KEYS: Record<TabType, string> = {
  upnext: "tabs.upNext",
  lyrics: "tabs.lyrics",
  related: "tabs.related",
};

interface PlayerTabsProps {
  initialTab?: TabType;
  coverUrl: string;
  title: string;
  artist_name: string;
  isPlaying: boolean;

  autoplayStartIndex?: number;

  lyricsText: string | null;
  lyricsLines: LyricLine[] | null;
  lyricsLoading: boolean;
  lyricsError: string | null;

  upNextData: any;
  upNextLoading: boolean;
  upNextError: string | null;

  relatedData: any;
  relatedLoading: boolean;
  relatedError: string | null;

  onTogglePlay: () => void;
  onCoverPress: () => void;
  onTabChange: (tab: TabType) => void;
  onFetchLyrics: () => Promise<void>;
  onFetchUpNext: () => Promise<void>;
  onFetchRelated: () => Promise<void>;

  onUpNextTrackPress?: (track: any, isFromAutoplay: boolean) => void;
  onRelatedTrackPress?: (track: any) => void;
  onRelatedArtistPress?: (artist_id: string) => void;
  onRelatedAlbumPress?: (album_id: string) => void;
}

export const PlayerTabs = React.memo(function PlayerTabs({
  initialTab = "upnext",
  coverUrl,
  title,
  artist_name,
  isPlaying,
  autoplayStartIndex = 0,
  lyricsText,
  lyricsLines,
  lyricsLoading,
  lyricsError,
  upNextData,
  upNextLoading,
  upNextError,
  relatedData,
  relatedLoading,
  relatedError,
  onTogglePlay,
  onCoverPress,
  onTabChange,
  onFetchLyrics,
  onFetchUpNext,
  onFetchRelated,
  onUpNextTrackPress,
  onRelatedTrackPress,
  onRelatedArtistPress,
  onRelatedAlbumPress,
}: PlayerTabsProps) {
  const { t } = useTranslation("player");
  const { currentSong } = useMusic();

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Helper para no refetchear si ya hay cualquiera de los dos formatos de lyrics
  const lyricsAlreadyLoaded = lyricsText != null || (lyricsLines != null && lyricsLines.length > 0);

  useEffect(() => {
    if (activeTab === "lyrics" && !lyricsAlreadyLoaded && !lyricsLoading) {
      onFetchLyrics();
    }
    if (activeTab === "upnext" && !upNextData && !upNextLoading) {
      onFetchUpNext();
    }
    if (activeTab === "related" && !relatedData && !relatedLoading) {
      onFetchRelated();
    }
  }, [activeTab]);

  const prevSongIdRef = useRef(currentSong?.id);

  useEffect(() => {
    const currentSongId = currentSong?.id;

    if (prevSongIdRef.current && currentSongId && prevSongIdRef.current !== currentSongId) {
      if (activeTab === "lyrics") onFetchLyrics();
      if (activeTab === "related") onFetchRelated();
    }

    prevSongIdRef.current = currentSongId;
  }, [currentSong?.id, activeTab]);

  const handleTabPress = (tab: TabType) => {
    setActiveTab(tab);
    onTabChange(tab);

    if (tab === "lyrics" && !lyricsAlreadyLoaded && !lyricsLoading) onFetchLyrics();
    if (tab === "upnext" && !upNextData && !upNextLoading) onFetchUpNext();
    if (tab === "related" && !relatedData && !relatedLoading) onFetchRelated();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onCoverPress} activeOpacity={0.8}>
          <Image source={coverUrl} style={styles.coverThumb} />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.headerArtist} numberOfLines={1}>
            {artist_name}
          </Text>
        </View>

        <TouchableOpacity onPress={onTogglePlay} style={styles.playButton}>
          <Ionicons name={isPlaying ? "pause" : "play"} size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabsContainer}>
        {(["upnext", "lyrics", "related"] as TabType[]).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => handleTabPress(tab)}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {t(TAB_I18N_KEYS[tab])}
            </Text>
            {activeTab === tab && <View style={styles.tabIndicator} />}
          </Pressable>
        ))}
      </View>

      {/* Lyrics tiene su propio scroll interno (ScrollView o FlatList segun el caso).
          No lo envolvemos en ProList para evitar nested virtualized lists y
          conflictos de scroll. UpNext y Related mantienen el ProList. */}
      {activeTab === "lyrics" ? (
        <View style={styles.contentContainer}>
          <LyricsTab
            lyricsText={lyricsText}
            lyricsLines={lyricsLines}
            lyricsLoading={lyricsLoading}
            lyricsError={lyricsError}
          />
        </View>
      ) : (
        <ProList
          style={styles.contentContainer}
          contentContainerStyle={styles.contentInner}
          showsVerticalScrollIndicator
          blockSize={2}
          initialBlocks={3}
          onEndReachedThreshold={0.5}
        >
          <View style={styles.tabContent}>
            {activeTab === "upnext" && (
              <UpNextTab
                upNextData={upNextData}
                upNextLoading={upNextLoading}
                upNextError={upNextError}
                onUpNextTrackPress={onUpNextTrackPress}
              />
            )}

            {activeTab === "related" && (
              <RelatedTab
                relatedData={relatedData}
                relatedLoading={relatedLoading}
                relatedError={relatedError}
                onRelatedTrackPress={onRelatedTrackPress}
                onRelatedArtistPress={onRelatedArtistPress}
                onRelatedAlbumPress={onRelatedAlbumPress}
              />
            )}
          </View>
        </ProList>
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.initialTab === nextProps.initialTab &&
    prevProps.coverUrl === nextProps.coverUrl &&
    prevProps.title === nextProps.title &&
    prevProps.artist_name === nextProps.artist_name &&
    prevProps.isPlaying === nextProps.isPlaying &&
    prevProps.autoplayStartIndex === nextProps.autoplayStartIndex &&
    prevProps.lyricsText === nextProps.lyricsText &&
    prevProps.lyricsLines === nextProps.lyricsLines &&
    prevProps.lyricsLoading === nextProps.lyricsLoading &&
    prevProps.upNextData === nextProps.upNextData &&
    prevProps.upNextLoading === nextProps.upNextLoading &&
    prevProps.relatedData === nextProps.relatedData &&
    prevProps.relatedLoading === nextProps.relatedLoading
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    paddingTop: Platform.OS === "ios" ? 44 : StatusBar.currentHeight || 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#222",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  coverThumb: {
    width: 56,
    height: 56,
    borderRadius: 6,
    backgroundColor: "#333",
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  headerArtist: {
    color: "#aaa",
    fontSize: 13,
  },
  playButton: {
    marginLeft: 12,
    padding: 8,
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#1a1a1a",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  tabActive: {},
  tabText: {
    color: "#888",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: "#fff",
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#fff",
  },
  contentContainer: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  tabContent: {
    flex: 1,
  },
});