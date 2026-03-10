import TrackActionsSheet from "@/components/shared/TrackActionsSheet";
import { useAutoplayManager } from "@/hooks/use-autoplay-manager";
import { useCoverAnimation } from "@/hooks/use-cover-animation";
import { usePlayerExpansion } from "@/hooks/use-player-expansion";
import { usePlayerPanGesture } from "@/hooks/use-player-pan-gesture";
import { usePlayerTheme } from "@/hooks/use-player-theme";
import { useRepeatMode } from "@/hooks/use-repeat-mode";
import { useTrackLikes } from "@/hooks/use-track-likes";
import { useTrackLyrics } from "@/hooks/use-track-lyrics";
import { useTrackMetadata } from "@/hooks/use-track-metadata";
import { useTrackRelated } from "@/hooks/use-track-related";
import { useTrackUpNext } from "@/hooks/use-track-upnext";
import { getUpgradedThumb } from "@/utils/image-helpers";
import { mapGenericTrack } from "@/utils/song-mapper";
import { router, usePathname } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useMusic } from "../../../hooks/use-music";
import { useMusicApi } from "../../../hooks/use-music-api";
import { Song } from "../../../types/music";
import { ExpandedPlayer } from "./ExpandedPlayer";
import { MiniPlayer } from "./MiniPlayer";

const ACCENT = "#ffffff" as const;

interface Props {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function MusicPlayer({ isPlaying, onTogglePlay, onNext, onPrev }: Props) {
  const {
    currentSong,
    queue,
    queueIndex,
    playSource,
    originalQueueSize,
    initialQueueSize,
    playFromRelated,
    skipToIndex,
    addToQueueAndPlay,
    setAutoplayProvider,
    setIsAutoplayEnabledCallback,
    shuffle,
    isShuffled,
    playbackError,
  } = useMusic();

  const { likeTrack, unlikeTrack, isTrackLiked, getTrackLyrics, getTrackUpNext, getTrackRelated } =
    useMusicApi() as any;

  const [actionsOpen, setActionsOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<any | null>(null);
  const [activePlayerTab, setActivePlayerTab] = useState<"upnext" | "lyrics" | "related" | null>(null);
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);

  const { isExpanded, isExpandedRef, slideAnim, expand, collapse } = usePlayerExpansion({
    activePlayerTab,
    onCloseTab: () => setActivePlayerTab(null),
  });

  const handleCollapse = useCallback(() => {
    if (activePlayerTab !== null) {
      setActivePlayerTab(null);
    } else {
      collapse();
    }
  }, [activePlayerTab, collapse]);

  const { panResponder, setPanLocked } = usePlayerPanGesture({
    isExpandedRef,
    slideAnim,
    collapse: handleCollapse,
  });

  const { isLiked, liking, toggleLike } = useTrackLikes({ currentSong, likeTrack, unlikeTrack, isTrackLiked });
  const { lyricsText, lyricsLoading, lyricsError, mainScrollRef, fetchLyrics } = useTrackLyrics({
    currentSong,
    getTrackLyrics,
    setPanLocked,
  });

  const { upNextData, upNextLoading, upNextError, shouldShowUpNext, fetchUpNext } = useTrackUpNext({
    currentSong,
    playSource,
    getTrackUpNext,
  });

  const { relatedData, relatedLoading, relatedError, shouldShowRelated, fetchRelated } = useTrackRelated({
    currentSong,
    playSource,
    getTrackRelated,
  });

  const { repeatOne, toggleRepeatOne } = useRepeatMode();
  const { artist_id, artist_name, rawThumb, thumbUrl, coverUrl, bgUrl } = useTrackMetadata(currentSong);
  const { gradient } = usePlayerTheme(rawThumb);
  const { coverScale } = useCoverAnimation(isPlaying);

  const { hasMoreAutoplay, markAsManuallyPlayed, resetAutoplay } = useAutoplayManager({
    currentSong,
    playSource,
    autoplayEnabled,
    shouldShowRelated,
    upNextData,
    fetchUpNext,
    fetchRelated,
    setAutoplayProvider,
    setIsAutoplayEnabledCallback,
    originalQueueSize,
    initialQueueSize,
  });

  const skipTabCloseOnNextSongChange = useRef(false);
  const pathname = usePathname();
  const navigatingRef = useRef(false);

  const isInOriginalQueue = queueIndex < originalQueueSize;
  const hasNext =
    (queueIndex >= 0 && queueIndex < queue.length - 1) ||
    (isInOriginalQueue && queueIndex === originalQueueSize - 1 && autoplayEnabled && hasMoreAutoplay);
  const hasPrev = queueIndex > 0;

  const goToArtist = useCallback(
    (aid?: string | null) => {
      if (!aid || navigatingRef.current) return;
      const match = pathname?.match(/\/artist\/([^/]+)/);
      const currentArtistInPath = match?.[1];

      if (currentArtistInPath && String(currentArtistInPath) === String(aid)) {
        if (isExpanded) collapse();
        return;
      }

      navigatingRef.current = true;

      if (pathname && pathname.includes("/artist/")) {
        router.replace(`/(tabs)/home/artist/${aid}`);
      } else {
        router.push(`/(tabs)/home/artist/${aid}`);
      }

      if (isExpanded) {
        setTimeout(() => collapse(), 100);
      }

      setTimeout(() => {
        navigatingRef.current = false;
      }, 250);
    },
    [pathname, isExpanded, collapse]
  );

  const goToAlbum = useCallback(
    (album_id?: string | null) => {
      if (!album_id || navigatingRef.current) return;
      navigatingRef.current = true;

      if (pathname && pathname.includes("/album/")) {
        router.replace(`/(tabs)/home/album/${album_id}`);
      } else {
        router.push(`/(tabs)/home/album/${album_id}`);
      }

      if (isExpanded) {
        setTimeout(() => collapse(), 100);
      }

      setTimeout(() => {
        navigatingRef.current = false;
      }, 250);
    },
    [pathname, isExpanded, collapse]
  );

  useEffect(() => {
    if (skipTabCloseOnNextSongChange.current) {
      skipTabCloseOnNextSongChange.current = false;
      return;
    }
    if (activePlayerTab !== null) {
      setActivePlayerTab(null);
    }
  }, [currentSong?.id]);

  const handleUpNextTrackPress = useCallback(
    async (track: any, isFromAutoplay: boolean) => {
      skipTabCloseOnNextSongChange.current = true;

      if (isFromAutoplay) {
        const trackId = track.track_id || track.id;
        const newSong = mapGenericTrack(track) as Song;
        markAsManuallyPlayed(trackId);
        await addToQueueAndPlay(newSong);
        return;
      }

      const targetIndex = track.__queueIndex;
      if (typeof targetIndex === "number" && targetIndex >= 0 && targetIndex < queue.length) {
        await skipToIndex(targetIndex);
      }
    },
    [markAsManuallyPlayed, addToQueueAndPlay, queue, skipToIndex]
  );

  const handleRelatedTrackPress = useCallback(
    async (track: any) => {
      skipTabCloseOnNextSongChange.current = true;

      const mappedTrack = mapGenericTrack(track);
      const newSong = {
        ...mappedTrack,
        thumbnail: getUpgradedThumb(track, 256) || mappedTrack.thumbnail,
      } as Song;

      resetAutoplay();
      await playFromRelated(newSong);
    },
    [resetAutoplay, playFromRelated]
  );

  const handleTabChange = useCallback((tab: "upnext" | "lyrics" | "related" | null) => {
    setActivePlayerTab(tab);
  }, []);

  const handleOpenActions = useCallback(() => {
    setSelectedTrack(currentSong);
    setActionsOpen(true);
  }, [currentSong]);

  const handleArtistPress = useCallback(
    () => goToArtist(artist_id || undefined),
    [goToArtist, artist_id]
  );

  const handleArtistPressExpanded = useCallback(
    () => goToArtist(artist_id),
    [goToArtist, artist_id]
  );

  if (!currentSong) return null;
  const songTitle = (currentSong as any)?.title ?? "";

  return (
    <>
      <MiniPlayer
        thumbUrl={thumbUrl}
        title={songTitle}
        artist_name={artist_name}
        gradient={gradient}
        isPlaying={isPlaying}
        hasNext={hasNext}
        onExpand={expand}
        onArtistPress={handleArtistPress}
        onTogglePlay={onTogglePlay}
        onNext={onNext}
      />

      <ExpandedPlayer
        isExpanded={isExpanded}
        slideAnim={slideAnim}
        panHandlers={panResponder.panHandlers}
        onUpNextTrackPress={handleUpNextTrackPress}
        onRelatedTrackPress={handleRelatedTrackPress}
        bgUrl={bgUrl}
        coverUrl={coverUrl}
        gradient={gradient}
        coverScale={coverScale}
        title={songTitle}
        artist_name={artist_name}
        artist_id={artist_id}
        playSource={playSource}
        originalQueueSize={originalQueueSize}
        isPlaying={isPlaying}
        hasPrev={hasPrev}
        hasNext={hasNext}
        repeatOne={repeatOne}
        isLiked={isLiked}
        liking={liking}
        activePlayerTab={activePlayerTab}
        onTabChange={handleTabChange}
        lyricsText={lyricsText}
        lyricsLoading={lyricsLoading}
        lyricsError={lyricsError}
        mainScrollRef={mainScrollRef}
        upNextData={upNextData}
        upNextLoading={upNextLoading}
        upNextError={upNextError}
        shouldShowUpNext={shouldShowUpNext}
        autoplayEnabled={autoplayEnabled}
        onAutoplayToggle={setAutoplayEnabled}
        relatedData={relatedData}
        relatedLoading={relatedLoading}
        relatedError={relatedError}
        shouldShowRelated={shouldShowRelated}
        onFetchLyrics={fetchLyrics}
        onFetchUpNext={fetchUpNext}
        onFetchRelated={fetchRelated}
        onCollapse={handleCollapse}
        onToggleLike={toggleLike}
        onOpenActions={handleOpenActions}
        onArtistPress={handleArtistPressExpanded}
        onTogglePlay={onTogglePlay}
        onPrev={onPrev}
        onNext={onNext}
        onToggleRepeat={toggleRepeatOne}
        onToggleShuffle={shuffle}
        shuffled={isShuffled}
        onRelatedArtistPress={goToArtist}
        onRelatedAlbumPress={goToAlbum}
        setPanLocked={setPanLocked}
        accentColor={ACCENT}
      />

      <TrackActionsSheet open={actionsOpen} onOpenChange={setActionsOpen} track={selectedTrack} />

      {playbackError && (
        <View style={{
          position: "absolute",
          bottom: 140,
          left: 20,
          right: 20,
          backgroundColor: "#e74c3c",
          borderRadius: 10,
          padding: 14,
          alignItems: "center",
        }}>
          <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>
            {playbackError}
          </Text>
        </View>
      )}
    </>
  );
}