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
import { useTrackRelated } from "@/src/hooks/use-track-related";
import { useTrackUpNext } from "@/src/hooks/use-track-upnext";
import { router, useLocalSearchParams, usePathname } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { BackHandler } from "react-native";
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
  const { currentSong, queue, queueIndex, playSource, originalQueueSize, initialQueueSize, playFromList, playFromRelated, skipToIndex, addToQueueAndPlay, setAutoplayProvider, setIsAutoplayEnabledCallback } = useMusic();
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
  const { isExpanded, isExpandedRef, slideAnim, expand, collapse } = usePlayerExpansion();
  
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

  const autoplayIndexRef = useRef(0);
  const skipTabCloseOnNextSongChange = useRef(false); // 🆕 Flag para NO cerrar tab
  
  // 🔥🔥🔥 NUEVO: Set para trackear canciones clickeadas manualmente del autoplay
  const manuallyPlayedAutoplayIds = useRef<Set<string>>(new Set());
  
  // Refs para autoplay persistente por contexto
  const upNextByContextRef = useRef<any>(null);
  const currentPlaySourceIdRef = useRef<string | null>(null);

  const pathname = usePathname();
  useLocalSearchParams<{ id?: string }>();
  const navigatingRef = useRef(false);

  // Early return después de todos los hooks
  if (!currentSong) return null;

  const isInOriginalQueue = queueIndex < originalQueueSize;
  
  // 🆕 Calcular cuántas canciones del autoplay hemos usado
  const contextUpNext = upNextByContextRef.current;
  const autoplayTracksAvailable = contextUpNext?.upNext && contextUpNext.upNext.length > 1
    ? contextUpNext.upNext.length - 1
    : 0;
  
  // Canciones agregadas del autoplay = originalQueueSize - initialQueueSize
  const autoplayTracksUsed = originalQueueSize - initialQueueSize;
  const hasMoreAutoplay = autoplayTracksUsed < autoplayTracksAvailable;

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
      router.replace(`/artist/${aid}`);
    } else {
      router.push(`/artist/${aid}`);
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

  // 🆕 Navegar a álbum desde Related
  const goToAlbum = (albumId?: string | null) => {
    if (!albumId || navigatingRef.current) return;
    console.log('📀 Navegando a álbum:', albumId);
    
    navigatingRef.current = true;

    if (pathname && pathname.includes("/album/")) {
      router.replace(`/album/${albumId}`);
    } else {
      router.push(`/album/${albumId}`);
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

  // 🆕 PASO 1: Cargar upNext UNA VEZ por contexto
  useEffect(() => {
    // Crear un ID único para el contexto actual
    const contextId = playSource?.type 
      ? `${playSource.type}-${playSource.id || playSource.name}` 
      : null;

    // Si cambió el contexto, cargar nuevo autoplay
    if (contextId && contextId !== currentPlaySourceIdRef.current) {
      console.log('🔄 Contexto cambió, cargando nuevo autoplay:', contextId);
      
      // Resetear para el nuevo contexto
      currentPlaySourceIdRef.current = contextId;
      upNextByContextRef.current = null;
      autoplayIndexRef.current = 0;
      manuallyPlayedAutoplayIds.current.clear(); // 🔥 Limpiar canciones clickeadas
      
      // Hacer fetch del upNext si hay una canción actual
      if (currentSong?.id) {
        fetchUpNext();
      }
    }
  }, [playSource?.type, playSource?.id, playSource?.name]);

  // 🔥 Cerrar tab cuando cambia la canción (EXCEPTO si fue por clic en autoplay)
  useEffect(() => {
    // Si el cambio fue por clic en autoplay, NO cerrar el tab
    if (skipTabCloseOnNextSongChange.current) {
      console.log('🎵 Canción cambió por autoplay, manteniendo tab abierto');
      skipTabCloseOnNextSongChange.current = false; // Reset flag
      return;
    }
    
    // En cualquier otro caso, cerrar el tab
    if (activePlayerTab !== null) {
      console.log('🎵 Canción cambió, cerrando tab');
      setActivePlayerTab(null);
    }
  }, [currentSong?.id]);

  // 🔥 INTERCEPTAR BACK BUTTON/GESTURE DE ANDROID
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Si el player está expandido
      if (isExpanded) {
        // Si hay un tab activo, solo cerrar el tab
        if (activePlayerTab !== null) {
          console.log('📱 Android back: Cerrando tab');
          setActivePlayerTab(null);
          return true; // Prevenir comportamiento por defecto
        } else {
          // Si no hay tab, colapsar el player
          console.log('📱 Android back: Colapsando player');
          collapse();
          return true; // Prevenir comportamiento por defecto
        }
      }
      
      // Si el player no está expandido, dejar que Android maneje el back
      return false;
    });

    return () => backHandler.remove();
  }, [isExpanded, activePlayerTab, collapse]);

  // 🆕 PASO 2: Guardar upNext cuando se carga
  useEffect(() => {
    if (upNextData && !upNextByContextRef.current) {
      console.log('💾 Guardando upNext para este contexto');
      upNextByContextRef.current = upNextData;
    }
  }, [upNextData]);

  // 🔥 Recargar Related automáticamente cuando cambia la canción
  useEffect(() => {
    if (currentSong?.id && shouldShowRelated) {
      console.log('🔄 Canción cambió, recargando Related en background');
      fetchRelated();
    }
  }, [currentSong?.id]);

  // 🔥 Recargar upNext automáticamente cuando cambia canción en contexto Related Y fue reseteado
  useEffect(() => {
    // Solo recargar si:
    // 1. Hay una canción actual
    // 2. El contexto es "related"
    // 3. El upNext fue reseteado (upNextByContextRef es null)
    if (currentSong?.id && playSource?.type === 'related' && !upNextByContextRef.current) {
      console.log('🔄 Nueva canción en Related detectada, cargando autoplay fresco');
      fetchUpNext();
    }
  }, [currentSong?.id, playSource?.type]);

  // 🔥🔥🔥 PASO 3: Configurar autoplay provider con lógica para SALTEAR canciones clickeadas
  useEffect(() => {
    const provider = () => {
      if (!autoplayEnabled) return null;

      // Usar datos guardados del contexto (NO upNextData que puede cambiar)
      const contextUpNext = upNextByContextRef.current;
      const autoplayTracks = contextUpNext?.upNext;
      
      if (!autoplayTracks || autoplayTracks.length <= 1) return null;

      const availableTracks = autoplayTracks.slice(1);

      // 🔥 Buscar la SIGUIENTE canción que NO haya sido clickeada manualmente
      while (autoplayIndexRef.current < availableTracks.length) {
        const track = availableTracks[autoplayIndexRef.current];
        const trackId = track.videoId || track.id;
        
        // Si esta canción YA fue clickeada manualmente, saltearla
        if (manuallyPlayedAutoplayIds.current.has(trackId)) {
          console.log(`⏭️ Salteando "${track.title}" porque ya fue reproducida manualmente`);
          autoplayIndexRef.current += 1;
          continue; // Probar con la siguiente
        }
        
        // Encontramos una canción que NO fue clickeada, devolverla
        autoplayIndexRef.current += 1;
        
        return {
          id: trackId,
          title: track.title,
          artistName: track.artists?.map((a: any) => a.name).join(", ") || "Unknown",
          artistId: track.artists?.[0]?.id || null,
          thumbnail: track.thumbnail?.[0]?.url || track.thumbnails?.[0]?.url || null,
          duration: track.duration || "--:--",
          durationSeconds: null,
          albumId: null,
        } as Song;
      }

      // Si llegamos aquí, se acabó el autoplay
      return null;
    };

    setAutoplayProvider(provider);
    setIsAutoplayEnabledCallback(() => autoplayEnabled);

    return () => {
      setAutoplayProvider(null);
      setIsAutoplayEnabledCallback(null);
    };
  }, [autoplayEnabled, setAutoplayProvider, setIsAutoplayEnabledCallback]); // ← SIN upNextData!

  // 🔥🔥🔥 HANDLER MODIFICADO: Marcar canciones clickeadas del autoplay
  const handleUpNextTrackPress = async (track: any, isFromAutoplay: boolean) => {
    console.log('🎵 handleUpNextTrackPress:', track.title, '| isFromAutoplay:', isFromAutoplay);

    // 🔥 SIEMPRE activar flag para NO cerrar el tab (tanto autoplay como playlist)
    skipTabCloseOnNextSongChange.current = true;

    // Si es del autoplay, crear el objeto Song y agregar a la cola
    if (isFromAutoplay) {
      const trackId = track.videoId || track.id;
      
      const newSong: Song = {
        id: trackId,
        title: track.title,
        artistName: track.artists?.map((a: any) => a.name).join(", ") || "Unknown",
        artistId: track.artists?.[0]?.id || null,
        thumbnail: track.thumbnail?.[0]?.url || track.thumbnails?.[0]?.url || null,
        duration: track.duration || "--:--",
        durationSeconds: null,
        albumId: null,
      } as Song;

      // 🔥🔥🔥 MARCAR esta canción como "ya reproducida manualmente"
      manuallyPlayedAutoplayIds.current.add(trackId);
      console.log(`🗑️ Marcando "${track.title}" como reproducida manualmente (saltear en autoplay)`);

      console.log('➕ Agregando canción del autoplay a la cola original');
      await addToQueueAndPlay(newSong);
      return;
    }

    // Si NO es del autoplay, la canción ya está en el queue
    // Usar el índice que viene en el track
    const targetIndex = track.__queueIndex;
    
    if (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex < queue.length) {
      console.log('⏭️  Saltando a canción en posición:', targetIndex);
      await skipToIndex(targetIndex);
    } else {
      console.error('❌ Índice inválido:', targetIndex);
    }
  };

  // 🆕 Handler para reproducir canción desde Related
  const handleRelatedTrackPress = async (track: any) => {
    console.log('🎵 handleRelatedTrackPress:', track.title);
    console.log('🗑️ Borrando queue anterior y creando nueva desde Related');

    // 🔥 Activar flag para NO cerrar el tab
    skipTabCloseOnNextSongChange.current = true;

    // Crear el objeto Song desde el track de Related
    const trackId = track.videoId || track.id;
    
    const newSong: Song = {
      id: trackId,
      title: track.title,
      artistName: track.artists?.map((a: any) => a.name).join(", ") || "Unknown",
      artistId: track.artists?.[0]?.id || null,
      thumbnail: track.thumbnail?.[0]?.url || track.thumbnails?.[0]?.url || null,
      duration: track.duration || "--:--",
      durationSeconds: null,
      albumId: null,
    } as Song;

    // 🔥🔥🔥 RESETEAR AUTOPLAY para la nueva canción
    console.log('🔄 Reseteando autoplay para la nueva canción');
    upNextByContextRef.current = null;
    autoplayIndexRef.current = 0;
    manuallyPlayedAutoplayIds.current.clear();
    
    // 🔥 Llamar a playFromRelated para borrar queue y crear nueva
    await playFromRelated(newSong);
    
    // ✅ El useEffect se encargará de cargar el nuevo autoplay cuando detecte el cambio de currentSong
    console.log('✅ Nueva queue desde Related creada (autoplay se recargará automáticamente)');
  };

  // 🆕 Handler para cambio de tab
  const handleTabChange = (tab: "upnext" | "lyrics" | "related" | null) => {
    setActivePlayerTab(tab);
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
        onUpNextTrackPress={handleUpNextTrackPress}
        onRelatedTrackPress={handleRelatedTrackPress} // 🆕 Reproducir desde Related
        bgUrl={bgUrl}
        coverUrl={coverUrl}
        gradient={gradient}
        coverScale={coverScale}
        title={(currentSong as any)?.title ?? ""}
        artistName={artistName}
        artistId={artistId}
        playSource={playSource}
        currentSong={currentSong} // 🆕 Para detectar cambios
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
        onCollapse={handleCollapse} // ← 🔥 Pasar handleCollapse en lugar de collapse
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
        onToggleUpNext={toggleUpNext}
        onToggleRelated={toggleRelated}
        onRelatedArtistPress={goToArtist} // 🆕 Navegar a artista desde Related
        onRelatedAlbumPress={goToAlbum}   // 🆕 Navegar a álbum desde Related
        setPanLocked={setPanLocked}
        formatTime={formatDuration}
        accentColor={ACCENT}
      />

      {/* SHEET acciones */}
      <TrackActionsSheet open={actionsOpen} onOpenChange={setActionsOpen} track={selectedTrack} />
    </>
  );
}