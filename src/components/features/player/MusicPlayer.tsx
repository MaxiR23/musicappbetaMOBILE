import TrackActionsSheet from "@/src/components/shared/TrackActionsSheet";
import { useCoverAnimation } from "@/src/hooks/use-cover-animation";
import { usePlayerExpansion } from "@/src/hooks/use-player-expansion";
import { usePlayerPanGesture } from "@/src/hooks/use-player-pan-gesture";
import { usePlayerTheme } from "@/src/hooks/use-player-theme";
import { useRepeatMode } from "@/src/hooks/use-repeat-mode";
import { useSeekSlider } from "@/src/hooks/use-seek-slider";
import { useTrackLikes } from "@/src/hooks/use-track-likes";
import { useTrackLyrics } from "@/src/hooks/use-track-lyrics";
import { useTrackMetadata } from "@/src/hooks/use-track-metadata";
import { router, useLocalSearchParams, usePathname } from "expo-router";
import React, { useRef, useState } from "react";
import { useMusic } from "../../../hooks/use-music";
import { useMusicApi } from "../../../hooks/use-music-api";
import { formatDuration } from "../../../utils/durations";
import { ExpandedPlayer } from "./ExpandedPlayer";
import { MiniPlayer } from "./MiniPlayer";

const ACCENT = "#ffffff" as const;
interface Props {
  isPlaying: boolean;
  progress: number; // 0..1
  duration: number; // ms
  currentTime: number; // ms
  onTogglePlay: () => void;
  onSeek: (val01: number) => void; // 0..1
  onNext: () => void;
  onPrev: () => void;
}

export default function MusicPlayer({
  isPlaying,
  progress,
  duration,
  currentTime,
  onTogglePlay,
  onSeek,
  onNext,
  onPrev,
}: Props) {
  const { currentSong, queue, queueIndex, playSource } = useMusic();
  const { likeTrack, unlikeTrack, isTrackLiked, getTrackLyrics } = useMusicApi() as any;

  // hooks
  const { isExpanded, isExpandedRef, slideAnim, expand, collapse } = usePlayerExpansion();
  const { panResponder, setPanLocked } = usePlayerPanGesture({ isExpandedRef, slideAnim, collapse });
  const { isLiked, liking, toggleLike } = useTrackLikes({ currentSong, likeTrack, unlikeTrack, isTrackLiked });
  const { lyricsOpen, lyricsText, lyricsLoading, lyricsError, mainScrollRef, toggleLyrics } = useTrackLyrics({
    currentSong,
    getTrackLyrics,
    setPanLocked,
  });
  const { dragging, localVal, knobScale, displayCurrentMs, setLocalVal, startDrag, endDrag } = useSeekSlider({
    progress,
    duration,
    currentTime,
    onSeek,
  });
  const { repeatOne, toggleRepeatOne } = useRepeatMode();
  const { artistId, artistName, rawThumb, thumbUrl, coverUrl, bgUrl } = useTrackMetadata(currentSong);
  const { gradient } = usePlayerTheme(rawThumb);
  const { coverScale } = useCoverAnimation(isPlaying);

  // Estados locales
  const [actionsOpen, setActionsOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<any | null>(null);

  const pathname = usePathname();
  useLocalSearchParams<{ id?: string }>();
  const navigatingRef = useRef(false);

  // Early return después de todos los hooks
  if (!currentSong) return null;

  const hasNext = queueIndex >= 0 && queueIndex < queue.length - 1;
  const hasPrev = queueIndex > 0;

  const goToArtist = (aid?: string | null) => {
    if (!aid || navigatingRef.current) return;
    const match = pathname?.match(/\/artist\/([^/]+)/);
    const currentArtistInPath = match?.[1];

    // Si ya estamos en ese artista, solo colapsar
    if (currentArtistInPath && String(currentArtistInPath) === String(aid)) {
      if (isExpanded) collapse();
      return;
    }

    navigatingRef.current = true;

    // Navegar inmediatamente sin colapsar
    if (pathname && pathname.includes("/artist/")) {
      router.replace(`/artist/${aid}`);
    } else {
      router.push(`/artist/${aid}`);
    }

    // Colapsar DESPUÉS de navegar
    if (isExpanded) {
      setTimeout(() => {
        collapse();
      }, 100);
    }

    setTimeout(() => {
      navigatingRef.current = false;
    }, 250);
  };

  return (
    <>
      <MiniPlayer
        thumbUrl={thumbUrl}
        title={(currentSong as any)?.title ?? ""}
        artistName={artistName}
        gradient={gradient}
        isPlaying={isPlaying}
        hasNext={hasNext}
        onExpand={expand}
        onArtistPress={() => goToArtist(artistId || undefined)}
        onTogglePlay={onTogglePlay}
        onNext={onNext}
      />

      {/* EXPANDIDO */}
      <ExpandedPlayer
        isExpanded={isExpanded}
        slideAnim={slideAnim}
        panHandlers={panResponder.panHandlers}
        bgUrl={bgUrl}
        coverUrl={coverUrl}
        gradient={gradient}
        coverScale={coverScale}
        title={(currentSong as any)?.title ?? ""}
        artistName={artistName}
        artistId={artistId}
        playSource={playSource}
        isPlaying={isPlaying}
        hasPrev={hasPrev}
        hasNext={hasNext}
        repeatOne={repeatOne}
        isLiked={isLiked}
        liking={liking}
        localVal={localVal}
        dragging={dragging}
        knobScale={knobScale}
        displayCurrentMs={displayCurrentMs}
        duration={duration}
        lyricsOpen={lyricsOpen}
        lyricsText={lyricsText}
        lyricsLoading={lyricsLoading}
        lyricsError={lyricsError}
        mainScrollRef={mainScrollRef}
        onCollapse={collapse}
        onToggleLike={toggleLike}
        onOpenActions={() => {
          setSelectedTrack(currentSong);
          setActionsOpen(true);
        }}
        onArtistPress={() => goToArtist(artistId)}
        onTogglePlay={onTogglePlay}
        onPrev={onPrev}
        onNext={onNext}
        onToggleRepeat={toggleRepeatOne}
        onSlidingStart={startDrag}
        onValueChange={setLocalVal}
        onSlidingComplete={endDrag}
        onToggleLyrics={toggleLyrics}
        setPanLocked={setPanLocked}
        formatTime={formatDuration}
        accentColor={ACCENT}
      />

      {/* SHEET acciones */}
      <TrackActionsSheet open={actionsOpen} onOpenChange={setActionsOpen} track={selectedTrack} />
    </>
  );
}