import TrackActionsSheet from "@/src/components/shared/TrackActionsSheet";
import { useAutoplayManager } from "@/src/hooks/use-autoplay-manager";
import { useCoverAnimation } from "@/src/hooks/use-cover-animation";
import { usePlayerExpansion } from "@/src/hooks/use-player-expansion";
import { usePlayerPanGesture } from "@/src/hooks/use-player-pan-gesture";
import { usePlayerTheme } from "@/src/hooks/use-player-theme";
import { useRepeatMode } from "@/src/hooks/use-repeat-mode";
import { useSeekSlider } from "@/src/hooks/use-seek-slider";
import { useTrackLikes } from "@/src/hooks/use-track-likes";
import { useTrackLyrics } from "@/src/hooks/use-track-lyrics";
import { useTrackMetadata } from "@/src/hooks/use-track-metadata";
import { useTrackRelated } from "@/src/hooks/use-track-related";
import { useTrackUpNext } from "@/src/hooks/use-track-upnext";
import { getUpgradedThumb } from "@/src/utils/image-helpers";
import { mapGenericTrack } from "@/src/utils/song-mapper";
import { router, usePathname } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { useMusic } from "../../../hooks/use-music";
import { useMusicApi } from "../../../hooks/use-music-api";
import { Song } from "../../../types/music";
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
  const { currentSong, queue, queueIndex, playSource, originalQueueSize, initialQueueSize, playFromRelated, skipToIndex, addToQueueAndPlay, setAutoplayProvider, setIsAutoplayEnabledCallback, shuffle, isShuffled } = useMusic();
  const {
    likeTrack,
    unlikeTrack,
    isTrackLiked,
    getTrackLyrics,
    getTrackUpNext,
    getTrackRelated,
  } = useMusicApi() as any;

  // 🔥 Estados locales - MOVER ANTES de los hooks que los necesitan
  const [actionsOpen, setActionsOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<any | null>(null);
  const [activePlayerTab, setActivePlayerTab] = useState<"upnext" | "lyrics" | "related" | null>(null);
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);

  // hooks
  const { isExpanded, isExpandedRef, slideAnim, expand, collapse } = usePlayerExpansion({
    activePlayerTab,
    onCloseTab: () => setActivePlayerTab(null),
  });

  // 🔥 NUEVA LÓGICA: Collapse inteligente con useCallback
  const handleCollapse = React.useCallback(() => {
    if (activePlayerTab !== null) {
      // Si hay un tab activo, solo cerrar el tab (mantener expanded)
      console.log('📱 Cerrando tab, manteniendo player expandido');
      setActivePlayerTab(null);
    } else {
      // Si no hay tab activo, hacer collapse completo al mini
      console.log('📱 Colapsando player al mini');
      collapse();
    }
  }, [activePlayerTab, collapse]);

  const { panResponder, setPanLocked } = usePlayerPanGesture({
    isExpandedRef,
    slideAnim,
    collapse: handleCollapse // ← Usar la función inteligente en lugar de collapse directo
  });

  const { isLiked, liking, toggleLike } = useTrackLikes({ currentSong, likeTrack, unlikeTrack, isTrackLiked });
  const { lyricsOpen, lyricsText, lyricsLoading, lyricsError, mainScrollRef, toggleLyrics, fetchLyrics } = useTrackLyrics({
    currentSong,
    getTrackLyrics,
    setPanLocked,
  });

  // Up Next
  const {
    upNextOpen,
    upNextData,
    upNextLoading,
    upNextError,
    toggleUpNext,
    shouldShowUpNext,
    fetchUpNext,
  } = useTrackUpNext({
    currentSong,
    playSource,
    getTrackUpNext,
  });

  // Related
  const {
    relatedOpen,
    relatedData,
    relatedLoading,
    relatedError,
    toggleRelated,
    shouldShowRelated,
    fetchRelated
  } = useTrackRelated({
    currentSong,
    playSource,
    getTrackRelated,
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

  const {
    hasMoreAutoplay,
    markAsManuallyPlayed,
    resetAutoplay,
  } = useAutoplayManager({
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

  const skipTabCloseOnNextSongChange = useRef(false); // Flag para NO cerrar tab

  const pathname = usePathname();
  const navigatingRef = useRef(false);

  const isInOriginalQueue = queueIndex < originalQueueSize;

  const hasNext =
    (queueIndex >= 0 && queueIndex < queue.length - 1) ||
    (isInOriginalQueue && queueIndex === originalQueueSize - 1 && autoplayEnabled && hasMoreAutoplay);
  const hasPrev = queueIndex > 0;

  const goToArtist = (aid?: string | null) => {
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
      setTimeout(() => {
        collapse();
      }, 100);
    }

    setTimeout(() => {
      navigatingRef.current = false;
    }, 250);
  };

  // Navegar a álbum desde Related
  const goToAlbum = (albumId?: string | null) => {
    if (!albumId || navigatingRef.current) return;
    console.log('📀 Navegando a álbum:', albumId);

    navigatingRef.current = true;

    if (pathname && pathname.includes("/album/")) {
      router.replace(`/(tabs)/home/album/${albumId}`);
    } else {
      router.push(`/(tabs)/home/album/${albumId}`);
    }

    if (isExpanded) {
      setTimeout(() => {
        collapse();
      }, 100);
    }

    setTimeout(() => {
      navigatingRef.current = false;
    }, 250);
  };

  // Cerrar tab cuando cambia la canción (EXCEPTO si fue por clic en autoplay)
  useEffect(() => {
    // Si el cambio fue por clic en autoplay, NO cerrar el tab
    if (skipTabCloseOnNextSongChange.current) {
      console.log('Canción cambió por autoplay, manteniendo tab abierto');
      skipTabCloseOnNextSongChange.current = false; // Reset flag
      return;
    }

    // En cualquier otro caso, cerrar el tab
    if (activePlayerTab !== null) {
      console.log('Canción cambió, cerrando tab');
      setActivePlayerTab(null);
    }
  }, [currentSong?.id]);

  // HANDLER MODIFICADO: Marcar canciones clickeadas del autoplay
  const handleUpNextTrackPress = async (track: any, isFromAutoplay: boolean) => {
    console.log('handleUpNextTrackPress:', track.title, '| isFromAutoplay:', isFromAutoplay);

    // SIEMPRE activar flag para NO cerrar el tab (tanto autoplay como playlist)
    skipTabCloseOnNextSongChange.current = true;

    // Si es del autoplay, crear el objeto Song y agregar a la cola
    if (isFromAutoplay) {
      const trackId = track.videoId || track.id;
      const newSong = mapGenericTrack(track) as Song;

      markAsManuallyPlayed(trackId);
      console.log(`Marcando "${track.title}" como reproducida manualmente (saltear en autoplay)`);

      console.log('Agregando canción del autoplay a la cola original');
      await addToQueueAndPlay(newSong);
      return;
    }

    // Si NO es del autoplay, la canción ya está en el queue
    // Usar el índice que viene en el track
    const targetIndex = track.__queueIndex;

    if (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex < queue.length) {
      console.log('Saltando a canción en posición:', targetIndex);
      await skipToIndex(targetIndex);
    } else {
      console.error('Índice inválido:', targetIndex);
    }
  };

  // Handler para reproducir canción desde Related
  const handleRelatedTrackPress = async (track: any) => {
    console.log('handleRelatedTrackPress:', track.title);
    console.log('Borrando queue anterior y creando nueva desde Related');

    // Activar flag para NO cerrar el tab
    skipTabCloseOnNextSongChange.current = true;

    const mappedTrack = mapGenericTrack(track);
    const newSong = {
      ...mappedTrack,
      thumbnail: getUpgradedThumb(track, 256) || mappedTrack.thumbnail,
    } as Song;

    // RESETEAR AUTOPLAY para la nueva canción
    console.log('Reseteando autoplay para la nueva canción');
    resetAutoplay();

    // Llamar a playFromRelated para borrar queue y crear nueva
    await playFromRelated(newSong);

    // El useEffect se encargará de cargar el nuevo autoplay cuando detecte el cambio de currentSong
    console.log('✅ Nueva queue desde Related creada (autoplay se recargará automáticamente)');
  };

  // Handler para cambio de tab
  const handleTabChange = (tab: "upnext" | "lyrics" | "related" | null) => {
    setActivePlayerTab(tab);
  };

  // Early return después de todos los hooks
  if (!currentSong) return null;
  const songTitle = (currentSong as any)?.title ?? "";

  return (
    <>
      <MiniPlayer
        thumbUrl={thumbUrl}
        title={songTitle}
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
        onUpNextTrackPress={handleUpNextTrackPress}
        onRelatedTrackPress={handleRelatedTrackPress}
        bgUrl={bgUrl}
        coverUrl={coverUrl}
        gradient={gradient}
        coverScale={coverScale}
        title={songTitle}
        artistName={artistName}
        artistId={artistId}
        playSource={playSource}
        currentSong={currentSong} //Para detectar cambios
        queue={queue}
        queueIndex={queueIndex}
        originalQueueSize={originalQueueSize}
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
        activePlayerTab={activePlayerTab}
        onTabChange={handleTabChange}
        lyricsOpen={lyricsOpen}
        lyricsText={lyricsText}
        lyricsLoading={lyricsLoading}
        lyricsError={lyricsError}
        mainScrollRef={mainScrollRef}
        upNextOpen={upNextOpen}
        upNextData={upNextData}
        upNextLoading={upNextLoading}
        upNextError={upNextError}
        shouldShowUpNext={shouldShowUpNext}
        autoplayEnabled={autoplayEnabled}
        onAutoplayToggle={setAutoplayEnabled}
        relatedOpen={relatedOpen}
        relatedData={relatedData}
        relatedLoading={relatedLoading}
        relatedError={relatedError}
        shouldShowRelated={shouldShowRelated}
        onFetchLyrics={fetchLyrics}
        onFetchUpNext={fetchUpNext}
        onFetchRelated={fetchRelated}
        onCollapse={handleCollapse}
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
        onToggleShuffle={shuffle}
        shuffled={isShuffled}
        onSlidingStart={startDrag}
        onValueChange={setLocalVal}
        onSlidingComplete={endDrag}
        onToggleLyrics={toggleLyrics}
        onToggleUpNext={toggleUpNext}
        onToggleRelated={toggleRelated}
        onRelatedArtistPress={goToArtist}
        onRelatedAlbumPress={goToAlbum}
        setPanLocked={setPanLocked}
        formatTime={formatDuration}
        accentColor={ACCENT}
      />

      {/* SHEET acciones */}
      <TrackActionsSheet open={actionsOpen} onOpenChange={setActionsOpen} track={selectedTrack} />
    </>
  );
}