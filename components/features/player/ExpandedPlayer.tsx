import { usePlayerInsets } from "@/hooks/use-player-insets";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronDown } from "lucide-react-native";
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  Dimensions,
  Image,
  ImageBackground,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import TextTicker from "react-native-text-ticker";
import { usePlayerTabAnimation } from "../../../hooks/use-player-tab-animation";
import { PlayerControls } from "./PlayerControls";
import { PlayerTabs } from "./PlayerTabs";
import { SeekSlider } from "./SeekSlider";

const SCREEN_HEIGHT = Dimensions.get("window").height;

interface ExpandedPlayerProps {
  isExpanded: boolean;
  slideAnim: Animated.Value;
  panHandlers: any;
  bgUrl: string;
  coverUrl: string;
  gradient: [string, string];
  coverScale: Animated.Value;
  title: string;
  artist_name: string;
  artist_id: string | null;
  playSource: any;
  isPlaying: boolean;
  hasPrev: boolean;
  hasNext: boolean;
  repeatOne: boolean;
  shuffled?: boolean;
  isLiked: boolean;
  liking: boolean;
  lyricsText: string | null;
  lyricsLoading: boolean;
  lyricsError: string | null;
  mainScrollRef: React.RefObject<ScrollView | null>;
  upNextData: any;
  upNextLoading: boolean;
  upNextError: string | null;
  shouldShowUpNext: boolean;
  autoplayEnabled: boolean;
  relatedData: any;
  relatedLoading: boolean;
  relatedError: string | null;
  shouldShowRelated: boolean;
  autoplayStartIndex: number;
  activePlayerTab: "upnext" | "lyrics" | "related" | null;
  onCollapse: () => void;
  onToggleLike: () => void;
  onOpenActions: () => void;
  onArtistPress: () => void;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToggleRepeat: () => void;
  onToggleShuffle?: () => void;
  onAutoplayToggle: (enabled: boolean) => void;
  onFetchLyrics: () => Promise<void>;
  onFetchUpNext: () => Promise<void>;
  onTabChange: (tab: "upnext" | "lyrics" | "related" | null) => void;
  onFetchRelated: () => Promise<void>;
  setPanLocked: (locked: boolean) => void;
  accentColor?: string;
  onUpNextTrackPress?: (track: any, isFromAutoplay: boolean) => void;
  onRelatedTrackPress?: (track: any) => void;
  onRelatedArtistPress?: (artist_id: string) => void;
  onRelatedAlbumPress?: (album_id: string) => void;
}

export const ExpandedPlayer = React.memo(function ExpandedPlayer({
  isExpanded,
  slideAnim,
  panHandlers,
  bgUrl,
  coverUrl,
  gradient,
  coverScale,
  title,
  artist_name,
  artist_id,
  playSource,
  isPlaying,
  hasPrev,
  hasNext,
  repeatOne,
  shuffled,
  isLiked,
  liking,
  lyricsText,
  lyricsLoading,
  lyricsError,
  mainScrollRef,
  upNextData,
  upNextLoading,
  upNextError,
  shouldShowUpNext,
  autoplayEnabled,
  relatedData,
  relatedLoading,
  relatedError,
  shouldShowRelated,
  activePlayerTab,
  autoplayStartIndex,
  onTabChange,
  onCollapse,
  onToggleLike,
  onOpenActions,
  onArtistPress,
  onTogglePlay,
  onAutoplayToggle,
  onPrev,
  onNext,
  onToggleRepeat,
  onToggleShuffle,
  onFetchLyrics,
  onFetchUpNext,
  onFetchRelated,
  setPanLocked,
  accentColor = "#ffffff",
  onUpNextTrackPress,
  onRelatedTrackPress,
  onRelatedArtistPress,
  onRelatedAlbumPress,
}: ExpandedPlayerProps) {
  const { t } = useTranslation("player");

  const {
    coverScale: tabCoverScale,
    coverTranslateY,
    controlsOpacity,
    tabsOpacity,
    tabsTranslateY,
  } = usePlayerTabAnimation({ activeTab: activePlayerTab });

  const showTabs = activePlayerTab !== null;

  const { height } = Dimensions.get("window");
  const dynamicTabMargin = useMemo(() => {
    if (height < 700) return 40;
    if (height < 800) return 60;
    return 90;
  }, [height]);

  const { paddingTop, paddingBottom } = usePlayerInsets();

  const sourceLabel = useMemo(() => {
    if (playSource?.type === "playlist") return t("source.playlist");
    if (playSource?.type === "album") return t("source.album");
    if (playSource?.type === "artist") return t("source.artist");
    return "";
  }, [playSource?.type, t]);

  return (
    <Animated.View
      {...(activePlayerTab === null ? panHandlers : {})}
      pointerEvents={isExpanded ? "auto" : "none"}
      style={[styles.container, { transform: [{ translateY: slideAnim }] }]}
    >
      <ImageBackground
        source={{ uri: bgUrl }}
        style={StyleSheet.absoluteFill}
        blurRadius={50}
        resizeMode="cover"
        imageStyle={{ backgroundColor: "#000" }}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>

      <StatusBar barStyle="light-content" />

      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: controlsOpacity }]}
        pointerEvents={showTabs ? "none" : "auto"}
      >
        <ScrollView
          ref={mainScrollRef}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          contentContainerStyle={{
            paddingTop,
            paddingHorizontal: 20,
            paddingBottom,
          }}
          scrollEventThrottle={16}
        >
          <View style={styles.dragHandleArea} pointerEvents="box-none">
            <View style={styles.dragHandle} />
          </View>

          <View style={styles.topBar}>
            <TouchableOpacity onPress={onCollapse}>
              <ChevronDown size={28} color="#fff" />
            </TouchableOpacity>

            <View style={styles.sourceContainer}>
              <Text style={styles.sourceLabel}>
                {sourceLabel}
              </Text>
              <Text style={styles.sourceName} numberOfLines={1} ellipsizeMode="tail">
                {playSource?.name ?? ""}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onOpenActions}
              style={{ padding: 4, width: 28, alignItems: "flex-end" }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <Animated.View
            style={[
              styles.coverCard,
              {
                transform: [
                  { scale: Animated.multiply(coverScale, tabCoverScale) },
                  { translateY: coverTranslateY },
                ],
              },
            ]}
          >
            <Image source={{ uri: coverUrl }} style={styles.coverImage} resizeMode="cover" />
            <LinearGradient
              pointerEvents="none"
              colors={["rgba(255,255,255,0.06)", "rgba(0,0,0,0)", "rgba(0,0,0,0.35)"]}
              locations={[0, 0.45, 1]}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          <View style={styles.metaWithActions}>
            <View style={styles.metaText}>
              <TextTicker
                style={styles.title}
                duration={12000}
                loop
                bounce={false}
                repeatSpacer={30}
                marqueeDelay={1000}
              >
                {title}
              </TextTicker>
              <TouchableOpacity onPress={onArtistPress} activeOpacity={1} style={{ alignSelf: "flex-start" }}>
                <Text style={styles.artist} numberOfLines={1}>
                  {artist_name}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={onToggleLike}
              disabled={liking}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name={isLiked ? "heart" : "heart-outline"} size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <SeekSlider />

          <PlayerControls
            isPlaying={isPlaying}
            hasPrev={hasPrev}
            hasNext={hasNext}
            repeatOne={repeatOne}
            shuffled={shuffled}
            onTogglePlay={onTogglePlay}
            onPrev={onPrev}
            onNext={onNext}
            onToggleRepeat={onToggleRepeat}
            onToggleShuffle={onToggleShuffle}
            accentColor={accentColor}
          />

          <View style={[styles.tabsContainer, { marginTop: dynamicTabMargin }]}>
            <TouchableOpacity style={styles.tab} onPress={() => onTabChange("upnext")}>
              <Text style={[styles.tabText, activePlayerTab === "upnext" && styles.tabTextActive]}>
                {t("tabs.upNext")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.tab} onPress={() => onTabChange("lyrics")}>
              <Text style={[styles.tabText, activePlayerTab === "lyrics" && styles.tabTextActive]}>
                {t("tabs.lyrics")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.tab} onPress={() => onTabChange("related")}>
              <Text style={[styles.tabText, activePlayerTab === "related" && styles.tabTextActive]}>
                {t("tabs.related")}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>

      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: tabsOpacity,
            transform: [{ translateY: tabsTranslateY }],
          },
        ]}
        pointerEvents={showTabs ? "box-none" : "none"}
      >
        <View style={{ flex: 1 }} pointerEvents={showTabs ? "auto" : "none"}>
          <PlayerTabs
            initialTab={activePlayerTab || "upnext"}
            coverUrl={coverUrl}
            title={title}
            artist_name={artist_name}
            isPlaying={isPlaying}
            autoplayStartIndex={autoplayStartIndex}
            lyricsText={lyricsText}
            lyricsLoading={lyricsLoading}
            lyricsError={lyricsError}
            upNextData={upNextData}
            upNextLoading={upNextLoading}
            upNextError={upNextError}
            relatedData={relatedData}
            relatedLoading={relatedLoading}
            relatedError={relatedError}
            onTogglePlay={onTogglePlay}
            onCoverPress={onCollapse}
            onTabChange={onTabChange}
            onFetchLyrics={onFetchLyrics}
            onFetchUpNext={onFetchUpNext}
            onFetchRelated={onFetchRelated}
            onUpNextTrackPress={onUpNextTrackPress}
            onRelatedTrackPress={onRelatedTrackPress}
            onRelatedArtistPress={onRelatedArtistPress}
            onRelatedAlbumPress={onRelatedAlbumPress}
          />
        </View>
      </Animated.View>
    </Animated.View>
  );
},
  (prev, next) =>
    prev.isExpanded === next.isExpanded &&
    prev.bgUrl === next.bgUrl &&
    prev.coverUrl === next.coverUrl &&
    prev.title === next.title &&
    prev.artist_name === next.artist_name &&
    prev.isPlaying === next.isPlaying &&
    prev.hasPrev === next.hasPrev &&
    prev.hasNext === next.hasNext &&
    prev.isLiked === next.isLiked &&
    prev.liking === next.liking &&
    prev.repeatOne === next.repeatOne &&
    prev.shuffled === next.shuffled &&
    prev.activePlayerTab === next.activePlayerTab &&
    prev.gradient[0] === next.gradient[0] &&
    prev.gradient[1] === next.gradient[1] &&
    prev.autoplayEnabled === next.autoplayEnabled &&
    prev.lyricsText === next.lyricsText &&
    prev.lyricsLoading === next.lyricsLoading &&
    prev.lyricsError === next.lyricsError &&
    prev.upNextData === next.upNextData &&
    prev.upNextLoading === next.upNextLoading &&
    prev.upNextError === next.upNextError &&
    prev.relatedData === next.relatedData &&
    prev.relatedLoading === next.relatedLoading &&
    prev.relatedError === next.relatedError &&
    prev.autoplayStartIndex === next.autoplayStartIndex &&
    prev.playSource === next.playSource
);

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    zIndex: 9999,
    height: SCREEN_HEIGHT,
    width: "100%",
    backgroundColor: "#000",
  },
  dragHandleArea: {
    position: "absolute",
    top: 18,
    left: 0,
    right: 0,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  sourceContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 10,
  },
  sourceLabel: {
    color: "#999",
    fontSize: 11,
    textAlign: "center",
  },
  sourceName: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  coverCard: {
    width: 330,
    height: 350,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
    alignSelf: "center",
    marginBottom: 20,
  },
  coverImage: { width: "100%", height: "100%" },
  metaWithActions: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
    marginLeft: 13,
    marginRight: 12,
  },
  metaText: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "left",
  },
  artist: { color: "#ccc", fontSize: 16 },
  tabsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 0,
    gap: 30,
  },
  tab: {
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tabText: {
    color: "#888",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: "#fff",
  },
});