import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import TrackRow from "../../shared/TrackRow";

import HorizontalScrollSection from "@/src/components/shared/HorizontalScrollSection";
import ProList from "@/src/components/shared/ProList";


type TabType = "upnext" | "lyrics" | "related";

/**
 * Determina el tipo de contenido de una sección de Related
 */
function getSectionType(section: any): "songs" | "artists" | "albums" | "unknown" {
  const title = section?.title?.toLowerCase() || "";

  if (title.includes("song") || title.includes("track")) {
    return "songs";
  }
  if (title.includes("artist")) {
    return "artists";
  }
  if (title.includes("album")) {
    return "albums";
  }

  // Fallback: mirar el primer item
  const firstItem = section?.contents?.[0];
  if (firstItem) {
    if (firstItem.videoId || firstItem.duration) return "songs";
    if (firstItem.browseId?.startsWith("UC")) return "artists";
    if (firstItem.browseId?.startsWith("MPREb_")) return "albums";
  }

  return "unknown";
}

interface PlayerTabsProps {
  initialTab?: TabType;
  // Metadata de la canción actual
  coverUrl: string;
  title: string;
  artistName: string;
  isPlaying: boolean;
  playSource?: any;
  currentSong?: any;

  // 🆕 Cola y autoplay
  queue?: any[];
  queueIndex?: number;
  originalQueueSize?: number;

  // Estados de cada tab
  lyricsText: string | null;
  lyricsLoading: boolean;
  lyricsError: string | null;

  upNextData: any;
  upNextLoading: boolean;
  upNextError: string | null;

  relatedData: any;
  relatedLoading: boolean;
  relatedError: string | null;

  // Callbacks
  onTogglePlay: () => void;
  onCoverPress: () => void; // 🔥 Para cerrar el tab (volver al expanded player)
  onTabChange: (tab: TabType) => void;
  onFetchLyrics: () => Promise<void>;
  onFetchUpNext: () => Promise<void>;
  onFetchRelated: () => Promise<void>;

  // 🆕 Callbacks para Up Next
  onUpNextTrackPress?: (track: any, isFromAutoplay: boolean) => void;

  // 🆕 Callbacks para Related
  onRelatedTrackPress?: (track: any) => void;
  onRelatedArtistPress?: (artistId: string) => void;
  onRelatedAlbumPress?: (albumId: string) => void;
}

export function PlayerTabs({
  initialTab = "upnext",
  coverUrl,
  title,
  artistName,
  isPlaying,
  playSource,
  currentSong,
  queue = [],
  queueIndex = -1,
  originalQueueSize = 0,
  lyricsText,
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
  onRelatedTrackPress, // 🆕
  onRelatedArtistPress, // 🆕
  onRelatedAlbumPress, // 🆕
}: PlayerTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Sincronizar con initialTab cuando cambie
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Hacer fetch inicial cuando se monta el componente
  useEffect(() => {
    const fetchInitialData = async () => {
      if (activeTab === "lyrics" && !lyricsText && !lyricsLoading) {
        await onFetchLyrics();
      }
      if (activeTab === "upnext" && !upNextData && !upNextLoading) {
        await onFetchUpNext();
      }
      if (activeTab === "related" && !relatedData && !relatedLoading) {
        await onFetchRelated();
      }
    };

    fetchInitialData();
  }, [activeTab]);

  // Refrescar datos cuando cambia la canción
  const prevSongIdRef = useRef(currentSong?.id);

  useEffect(() => {
    const currentSongId = currentSong?.id;

    // Si cambió la canción (y no es la primera carga)
    if (prevSongIdRef.current && currentSongId && prevSongIdRef.current !== currentSongId) {
      console.log('🔄 Canción cambió, refrescando datos...');

      // Refrescar según el tab activo
      if (activeTab === "lyrics") {
        onFetchLyrics();
      }
      // 🔥 NO refrescar upnext aquí - useTrackUpNext ya lo maneja por contexto
      // if (activeTab === "upnext") {
      //   onFetchUpNext();
      // }
      if (activeTab === "related") {
        onFetchRelated();
      }
    }

    // Actualizar referencia
    prevSongIdRef.current = currentSongId;
  }, [currentSong?.id, activeTab]);

  const handleTabPress = async (tab: TabType) => {
    setActiveTab(tab);
    onTabChange(tab);

    // Fetch data si es necesario
    if (tab === "lyrics" && !lyricsText && !lyricsLoading) {
      await onFetchLyrics();
    }
    if (tab === "upnext" && !upNextData && !upNextLoading) {
      await onFetchUpNext();
    }
    if (tab === "related" && !relatedData && !relatedLoading) {
      await onFetchRelated();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* HEADER MINIMIZADO */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onCoverPress} activeOpacity={0.8}>
          <Image source={{ uri: coverUrl }} style={styles.coverThumb} />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.headerArtist} numberOfLines={1}>
            {artistName}
          </Text>
        </View>

        <TouchableOpacity onPress={onTogglePlay} style={styles.playButton}>
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={28}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      {/* TABS HORIZONTALES */}
      <View style={styles.tabsContainer}>
        <Pressable
          onPress={() => handleTabPress("upnext")}
          style={[styles.tab, activeTab === "upnext" && styles.tabActive]}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "upnext" && styles.tabTextActive,
            ]}
          >
            UP NEXT
          </Text>
          {activeTab === "upnext" && <View style={styles.tabIndicator} />}
        </Pressable>

        <Pressable
          onPress={() => handleTabPress("lyrics")}
          style={[styles.tab, activeTab === "lyrics" && styles.tabActive]}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "lyrics" && styles.tabTextActive,
            ]}
          >
            LYRICS
          </Text>
          {activeTab === "lyrics" && <View style={styles.tabIndicator} />}
        </Pressable>

        <Pressable
          onPress={() => handleTabPress("related")}
          style={[styles.tab, activeTab === "related" && styles.tabActive]}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "related" && styles.tabTextActive,
            ]}
          >
            RELATED
          </Text>
          {activeTab === "related" && <View style={styles.tabIndicator} />}
        </Pressable>
      </View>

      {/* CONTENIDO DEL TAB ACTIVO */}
      <ProList
        style={styles.contentContainer}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator
        blockSize={2}
        initialBlocks={3}
        onEndReachedThreshold={0.5}
      >
        {/* UP NEXT */}
        {activeTab === "upnext" && (
          <View style={styles.tabContent}>
            {upNextLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.loadingText}>Loading queue...</Text>
              </View>
            )}

            {!upNextLoading && upNextError && (
              <Text style={styles.errorText}>{upNextError}</Text>
            )}

            {!upNextLoading && !upNextError && (
              <View>
                {/* Playing from header */}
                <View style={styles.playingFromHeader}>
                  <Text style={styles.playingFromLabel}>Playing from</Text>
                  <Text style={styles.playingFromName}>
                    {playSource?.name || "Unknown"}
                  </Text>
                </View>

                {/* TODA LA COLA ORIGINAL COMPLETA (nada se oculta) */}
                {(() => {
                  const originalQueue = queue.slice(0, originalQueueSize);
                  if (originalQueue.length === 0) return null;

                  return (
                    <View style={styles.queueSection}>
                      <FlatList
                        data={originalQueue}
                        keyExtractor={(track: any, idx: number) => `${track.id ?? idx}`}
                        renderItem={({ item: track, index: idx }) => {
                          const isCurrentTrack = idx === queueIndex;
                          return (
                            <TrackRow
                              trackId={track.id}
                              index={idx + 1}
                              title={track.title}
                              artist={track.artistName || track.artist}
                              thumbnail={track.thumbnail || track.thumbnail_url}
                              showIndex={false}
                              showMoreButton={true}
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
                  );
                })()}

                {(() => {
                  // 🆕 SECCIÓN 2: AUTOPLAY (sugerencias que NO están en el queue aún)
                  if (!upNextData?.upNext || upNextData.upNext.length <= 1) {
                    return null;
                  }

                  // Las sugerencias de autoplay (sin la primera que es la canción actual)
                  const autoplaySuggestions = upNextData.upNext.slice(1);

                  // IDs de canciones ya en el queue (para filtrar duplicados)
                  const queueIds = new Set(queue.map((s: any) => String(s.id)));

                  // Filtrar canciones que NO están en el queue
                  const autoplayNotInQueue = autoplaySuggestions.filter(
                    (track: any) => !queueIds.has(String(track.videoId || track.id))
                  );

                  if (autoplayNotInQueue.length === 0) {
                    return null;
                  }

                  return (
                    <View style={styles.queueSection}>
                      <View style={styles.autoplayHeader}>
                        <Text style={styles.queueSectionTitle}>Autoplay</Text>
                        <Text style={styles.autoplaySubtitle}>
                          Based on your queue
                        </Text>
                      </View>

                      {/* FlatList para carga progresiva; sin scroll propio para no pelear con el contenedor padre */}
                      <FlatList
                        data={autoplayNotInQueue}
                        keyExtractor={(track: any, idx: number) =>
                          `${track.videoId ?? track.id ?? idx}`
                        }
                        renderItem={({ item: track, index: idx }) => (
                          <TrackRow
                            key={track.videoId || idx}
                            trackId={track.videoId}
                            index={idx + 1}
                            title={track.title}
                            artist={track.artists?.map((a: any) => a.name).join(", ")}
                            thumbnail={track.thumbnail?.[0]?.url || track.thumbnails?.[0]?.url}
                            showIndex={false}
                            showMoreButton={false}
                            onPress={() => {
                              // Esta canción NO está en el queue, agregarla
                              if (onUpNextTrackPress) {
                                onUpNextTrackPress(track, true);
                              }
                            }}
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
                })()}

                {/* Mensaje si no hay nada */}
                {queue.length <= queueIndex + 1 && (!upNextData?.upNext || upNextData.upNext.length <= 1) && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.placeholderText}>No upcoming tracks</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* LYRICS */}
        {activeTab === "lyrics" && (
          <View style={styles.tabContent}>
            {lyricsLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.loadingText}>Loading lyrics...</Text>
              </View>
            )}

            {!lyricsLoading && lyricsError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{lyricsError}</Text>
              </View>
            )}

            {!lyricsLoading && !lyricsError && lyricsText && (
              <View style={styles.lyricsContainer}>
                <Text style={styles.lyricsText}>{lyricsText}</Text>
              </View>
            )}

            {!lyricsLoading && !lyricsError && !lyricsText && (
              <View style={styles.errorContainer}>
                <Text style={styles.placeholderText}>No lyrics available</Text>
              </View>
            )}
          </View>
        )}

        {/* RELATED */}
        {activeTab === "related" && (
          <View style={styles.tabContent}>
            {relatedLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.loadingText}>Loading related...</Text>
              </View>
            )}

            {!relatedLoading && relatedError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{relatedError}</Text>
              </View>
            )}

            {!relatedLoading && !relatedError && relatedData && (
              <View style={styles.relatedContent}>
                {relatedData.map((section: any, sIdx: number) => {
                  const sectionType = getSectionType(section);
                  const contents = section?.contents || [];

                  // Validar que contents sea un array y tenga elementos
                  if (!Array.isArray(contents) || !contents.length) return null;

                  // 🎵 CANCIONES → Usar TrackRow
                  if (sectionType === "songs") {
                    return (
                      <View key={sIdx} style={styles.relatedSection}>
                        <Text style={styles.relatedSectionTitle}>{section.title}</Text>

                        <FlatList
                          data={contents}
                          keyExtractor={(track: any, i: number) =>
                            `${track.videoId || track.id || "song"}-${i}`
                          }
                          renderItem={({ item: track, index: tIdx }) => (
                            <TrackRow
                              trackId={track.videoId}
                              index={tIdx + 1}
                              title={track.title}
                              artist={track.artists?.map((a: any) => a.name).join(", ")}
                              thumbnail={track.thumbnail?.[0]?.url || track.thumbnails?.[0]?.url}
                              showIndex={false}
                              showMoreButton={false}
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

                  // 👤 ARTISTAS → Scroll horizontal con fotos circulares
                  if (sectionType === "artists") {
                    return (
                      <View key={sIdx} style={styles.relatedSection}>
                        <HorizontalScrollSection
                          title={section.title}
                          items={contents}
                          keyExtractor={(a: any, i: number) => a.browseId ?? String(i)}
                          imageExtractor={(a: any) => a.thumbnail?.[0]?.url || a.thumbnails?.[0]?.url}
                          titleExtractor={(a: any) => a.title || a.name}
                          onItemPress={(a: any) => a.browseId && onRelatedArtistPress?.(a.browseId)}
                          circularImage
                          cardWidth={120}
                          imageHeight={120}
                          // match visual actual
                          titleStyle={styles.relatedSectionTitle}
                          contentPaddingHorizontal={12}
                          gap={16}
                          // perf equivalente a tu uso previo (opcional)
                          initialNumToRender={4}
                          maxToRenderPerBatch={2}
                          windowSize={3}
                        />
                      </View>
                    );
                  }

                  // 💿 ÁLBUMES → Scroll horizontal con fotos cuadradas
                  if (sectionType === "albums") {
                    return (
                      <View key={sIdx} style={styles.relatedSection}>
                        <HorizontalScrollSection
                          title={section.title}
                          items={contents}
                          keyExtractor={(al: any, i: number) => al.browseId ?? String(i)}
                          imageExtractor={(al: any) => al.thumbnail?.[0]?.url || al.thumbnails?.[0]?.url}
                          titleExtractor={(al: any) => al.title}
                          subtitleExtractor={(al: any) =>
                            al.year || (al.artists?.map((a: any) => a.name).join(", ") || "")
                          }
                          onItemPress={(al: any) => al.browseId && onRelatedAlbumPress?.(al.browseId)}
                          cardWidth={140}
                          imageHeight={140}
                          // match visual actual
                          titleStyle={styles.relatedSectionTitle}
                          contentPaddingHorizontal={12}
                          gap={16}
                          // perf opcional
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
            )}

            {!relatedLoading && !relatedError && !relatedData && (
              <View style={styles.errorContainer}>
                <Text style={styles.placeholderText}>No related content available</Text>
              </View>
            )}
          </View>
        )}
      </ProList>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    paddingTop: Platform.OS === "ios" ? 44 : StatusBar.currentHeight || 24,
  },

  // HEADER MINIMIZADO
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

  // TABS
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
  tabActive: {
    // El activo no necesita background especial
  },
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

  // CONTENIDO
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

  // UP NEXT
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

  // 🆕 Secciones de Queue
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

  // LYRICS
  lyricsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: "center",
  },
  lyricsText: {
    color: "#fff",
    fontSize: 16,
    lineHeight: 28,
    textAlign: "center",
    letterSpacing: 0.3,
  },

  // RELATED
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
  horizontalScroll: {
    paddingHorizontal: 12,
    gap: 16,
  },

  // ARTISTAS
  artistCard: {
    alignItems: "center",
    width: 120,
  },
  artistImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#333",
    marginBottom: 8,
  },
  artistName: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },

  // ÁLBUMES
  albumCard: {
    width: 140,
  },
  albumImage: {
    width: 140,
    height: 140,
    borderRadius: 8,
    backgroundColor: "#333",
    marginBottom: 8,
  },
  albumTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  albumSubtitle: {
    color: "#888",
    fontSize: 12,
  },

  // ESTADOS
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  loadingText: {
    color: "#888",
    fontSize: 14,
    marginTop: 16,
  },
  errorContainer: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 14,
    textAlign: "center",
  },
  placeholderText: {
    color: "#666",
    fontSize: 14,
    textAlign: "center",
  },
});