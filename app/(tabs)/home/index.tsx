import { useMusic } from "@/hooks/use-music";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  FlatList,
  InteractionManager,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { cleanExpiredCache } from "@/utils/cache";
import AsyncStorage from "@react-native-async-storage/async-storage";

import RecentSection from "@/components/features/home/RecentSection";
import TrackActionsSheet from "@/components/shared/TrackActionsSheet";
import { supabase } from "@/lib/supabase";

import HorizontalScrollSection from "@/components/shared/HorizontalScrollSection";

import FeedSection from "@/components/features/home/FeedSection";
import HomeFeatured from "@/components/features/home/HomeFeatured";
import HomeSkeleton from "@/components/features/home/HomeSkeleton";
import HomeStations from "@/components/features/home/HomeStation";
import RecommendedPlaylistsSection from "@/components/features/home/RecommendedPlaylistsSection";
import SimilarToHeader from "@/components/shared/SimilarToHeader";
import { useContentPadding } from "@/hooks/use-content-padding";
import { useHomeFeed } from "@/hooks/use-home-feed";
import { useHomeRecent } from "@/hooks/use-home-recent";
import { useProfile } from "@/hooks/use-profile";
import { useUserProfile } from "@/hooks/use-user-profile";

// Helper puro: no depende de nada del closure, vive afuera del componente.
function mapTracksForPlayer(arr: any[]) {
  return arr.map((t: any) => {
    const artists = Array.isArray(t.artists) ? t.artists : [];
    const primary = artists[0] ?? null;
    return {
      id: String(t.id),
      title: t.title,
      artist_name: primary?.name ?? "",
      artist_id: primary?.id ?? null,
      artists,
      album_id: t.album_id,
      album_name: t.album_name ?? t.album,
      thumbnail: t.thumb ?? t.thumbnail ?? t.thumbnail_url,
      thumbnail_url: t.thumb ?? t.thumbnail ?? t.thumbnail_url,
      duration_seconds:
        typeof t.duration_seconds === "number" ? t.duration_seconds : null,
    };
  });
}

// Wrapper de animacion: fade-in + leve slide-up cuando se monta.
// Driver nativo, no bloquea el JS thread.
// Stagger: las primeras secciones aparecen escalonadas (efecto cascada).
function FadeInItem({
  children,
  index,
}: {
  children: React.ReactNode;
  index: number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    // Stagger solo en los primeros items: 0ms, 80ms, 160ms, 240ms, 320ms.
    // Del 5to en adelante el delay queda fijo (estan offscreen, no se nota).
    const delay = Math.min(index, 4) * 80;

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 320,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 320,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
    // Solo al montar: si index cambia (no deberia, key es estable), no reanima.
     
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

type Section = { id: string; element: React.ReactNode };

export default function HomeScreen() {
  const router = useRouter();
  const { playList, currentSong } = useMusic();
  const contentPadding = useContentPadding();

  const [profileSheetOpen, setProfileSheetOpen] = useState(false);

  const { userName, userEmail, userId, initials, gradient } = useUserProfile();
  const { hasRole } = useProfile();
  const { recentVisible } = useHomeRecent(userId, currentSong?.id);
  const {
    newReleases,
    topAlbums,
    topTracks,
    seedTracks,
    recoAlbums,
    recoBySeed,
    upcomingReleases,
    listenAgainAlbum,
    replaySongs,
    replayLoading,
    feedReady,
    featuredRelease,
    recommendedPlaylists,
    userStations,
  } = useHomeFeed(userId);

  const { t } = useTranslation("home");

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(async () => {
      try {
        const lastClean = await AsyncStorage.getItem("cache:last-clean");
        const now = Date.now();
        const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;

        if (!lastClean || now - parseInt(lastClean) > THREE_DAYS) {
          console.log("[cache] Programando limpieza automatica...");

          setTimeout(async () => {
            await cleanExpiredCache();
            await AsyncStorage.setItem("cache:last-clean", String(now));
          }, 2000);
        }
      } catch (err) {
        console.warn("[cache] Error verificando limpieza:", err);
      }
    });

    return () => task.cancel();
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setProfileSheetOpen(false);
    } catch (err) {
      console.warn("Error al cerrar sesion:", err);
    }
  }, []);

  // Datos derivados (baratos, sin memo).
  const items1 = recoBySeed[0]?.[1] ?? [];
  const items2 = recoBySeed[1]?.[1] ?? [];
  const seed1 = items1[0]?.similar_to ?? null;
  const seed2 = items2[0]?.similar_to ?? null;

  // Armado de secciones inline. El costo es trivial.
  const sections: Section[] = [
    {
      id: "featured",
      element: (
        <HomeFeatured
          replaySongs={replaySongs}
          replayLoading={replayLoading}
          listenAgainAlbum={listenAgainAlbum}
          featuredRelease={featuredRelease}
        />
      ),
    },
    {
      id: "recent",
      element: <RecentSection items={recentVisible} />,
    },
    {
      id: "new-releases",
      element: (
        <FeedSection
          title={t("sections.newReleases.title")}
          items={newReleases.map((r) => ({
            id: r.album_id,
            title: r.album,
            artist: r.artist,
            thumbnail: r.thumbnail,
            artist_id: r.artist_id,
            release_date: r.release_date,
          }))}
          type="album"
          feedKey="new-releases"
        />
      ),
    },
  ];

  if (items1.length) {
    sections.push({
      id: "similar-1",
      element: (
        <>
          <SimilarToHeader
            name={seed1?.name}
            thumb={seed1?.thumbnail}
            style={{ paddingHorizontal: 10, paddingTop: 4 }}
          />
          <HorizontalScrollSection
            title=""
            items={items1}
            keyExtractor={(a, idx) => `${a.id}-${idx}`}
            imageExtractor={(a) =>
              Array.isArray(a.thumbnails) && a.thumbnails.length
                ? a.thumbnails[a.thumbnails.length - 1]?.url
                : undefined
            }
            titleExtractor={(a) => a.name}
            subtitleExtractor={() => t("labels.artist")}
            onItemPress={(a) =>
              router.push(`/(tabs)/home/artist/${encodeURIComponent(a.id)}`)
            }
            cardWidth={120}
            imageHeight={120}
            circularImage
            sectionStyle={{ marginTop: 2 }}
          />
        </>
      ),
    });
  }

  sections.push(
    {
      id: "top-albums",
      element: (
        <FeedSection
          title={t("sections.topAlbums.title")}
          items={topAlbums}
          type="album"
          feedKey="top-albums"
        />
      ),
    },
    {
      id: "top-tracks",
      element: (
        <FeedSection
          title={t("sections.topTracks.title")}
          items={topTracks}
          type="track"
          variant="compact"
          feedKey="top-tracks"
          onTrackPress={(index, queueName) => {
            playList(mapTracksForPlayer(topTracks), index, {
              type: "queue",
              name: queueName,
            });
          }}
        />
      ),
    }
  );

  if (items2.length) {
    sections.push({
      id: "similar-2",
      element: (
        <>
          <SimilarToHeader
            name={seed2?.name}
            thumb={seed2?.thumbnail}
            style={{ paddingHorizontal: 10, paddingTop: 4 }}
          />
          <HorizontalScrollSection
            title=""
            items={items2}
            keyExtractor={(a, idx) => `${a.id}-${idx}`}
            imageExtractor={(a) =>
              Array.isArray(a.thumbnails) && a.thumbnails.length
                ? a.thumbnails[a.thumbnails.length - 1]?.url
                : undefined
            }
            titleExtractor={(a) => a.name}
            subtitleExtractor={() => t("labels.artist")}
            onItemPress={(a) =>
              router.push(`/(tabs)/home/artist/${encodeURIComponent(a.id)}`)
            }
            cardWidth={120}
            imageHeight={120}
            circularImage
            sectionStyle={{ marginTop: 2 }}
          />
        </>
      ),
    });
  }

  sections.push(
    {
      id: "reco-playlists",
      element: <RecommendedPlaylistsSection playlists={recommendedPlaylists} />,
    },
    {
      id: "stations",
      element: (
        <HomeStations
          stations={userStations}
          title={t("sections.stationsForYou.title")}
        />
      ),
    },
    {
      id: "seed-tracks",
      element: (
        <FeedSection
          title={t("sections.fromSeed.title")}
          items={seedTracks}
          type="track"
          variant="compact"
          feedKey="seed-tracks"
          onTrackPress={(index, queueName) => {
            playList(mapTracksForPlayer(seedTracks), index, {
              type: "queue",
              name: queueName,
            });
          }}
        />
      ),
    },
    {
      id: "reco-albums",
      element: (
        <FeedSection
          title={t("sections.recoAlbums.title")}
          items={recoAlbums}
          type="album"
          feedKey="reco-albums"
        />
      ),
    },
    {
      id: "upcoming-releases",
      element: (
        <FeedSection
          title={t("sections.upcomingReleases.title")}
          items={upcomingReleases.map((r) => ({
            id: r.id,
            title: r.album,
            artist: r.artist,
            thumbnail: r.thumbnail,
          }))}
          type="album"
          feedKey="upcoming-releases"
          disablePress
        />
      ),
    }
  );

  return (
    <>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: "#0e0e0e" }}>
        <View
          style={{ paddingTop: 10, paddingHorizontal: 16, paddingBottom: 8 }}
        >
          <View
            style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
          >
            <TouchableOpacity
              onPress={() => setProfileSheetOpen(true)}
              activeOpacity={0.9}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                overflow: "hidden",
              }}
            >
              <LinearGradient
                colors={gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 19,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.18)",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "800" }}>
                  {initials}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {!feedReady || replayLoading ? (
        <HomeSkeleton />
      ) : (
        <>
          <FlatList<Section>
            data={sections}
            keyExtractor={(s) => s.id}
            renderItem={({ item, index }) => (
              <FadeInItem index={index}>{item.element}</FadeInItem>
            )}
            style={styles.container}
            contentContainerStyle={{
              ...contentPadding,
              paddingHorizontal: 8,
            }}
            bounces={false}
            overScrollMode="never"
            showsVerticalScrollIndicator={false}
            initialNumToRender={2}
            maxToRenderPerBatch={1}
            windowSize={5}
          />

          <TrackActionsSheet
            open={profileSheetOpen}
            onOpenChange={setProfileSheetOpen}
            track={null}
            headerTitle={t("account.title", { ns: "common" })}
            subtitle={`${
              userName || t("account.fallbackUser", { ns: "common" })
            }${userEmail ? " • " + userEmail : ""}`}
            showAddTo={false}
            showRemove={false}
            showShare={false}
            extraActions={[
              {
                key: "view-profile",
                label: t("actions.viewProfile", { ns: "profile" }),
                icon: "person-outline",
                onPress: () => {
                  setProfileSheetOpen(false);
                  router.push("/(tabs)/home/settings/profile");
                },
              },
              ...(hasRole("tester")
                ? [
                    {
                      key: "report-bug",
                      label: t("actions.reportBug", { ns: "bugReport" }),
                      icon: "bug-outline" as const,
                      onPress: () => {
                        setProfileSheetOpen(false);
                        router.push("/report-bug");
                      },
                    },
                    {
                      key: "view-reports",
                      label: hasRole("developer")
                        ? t("adminList.title", { ns: "bugReport" })
                        : t("myReports.title", { ns: "bugReport" }),
                      icon: "list-outline" as const,
                      onPress: () => {
                        setProfileSheetOpen(false);
                        router.push("/(tabs)/home/settings/bug-reports");
                      },
                    },
                  ]
                : []),
              {
                key: "logout",
                label: t("account.signOut", { ns: "common" }),
                icon: "log-out-outline",
                onPress: handleSignOut,
              },
            ]}
          />
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0e0e0e" },
});