import ProList from "@/components/shared/ProList";
import { useMusic } from "@/hooks/use-music";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  InteractionManager,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { cleanExpiredCache } from '@/utils/cache';
import AsyncStorage from '@react-native-async-storage/async-storage';

import RecentSection from "@/components/features/home/RecentSection";
import TrackActionsSheet from "@/components/shared/TrackActionsSheet";
import { supabase } from "@/lib/supabase";

import HorizontalScrollSection from "@/components/shared/HorizontalScrollSection";

import FeedSection from "@/components/features/home/FeedSection";
import HomeFeatured from "@/components/features/home/HomeFeatured";
import HomeSkeleton from "@/components/features/home/HomeSkeleton";
import SimilarToHeader from "@/components/shared/SimilarToHeader";
import { useContentPadding } from "@/hooks/use-content-padding";
import { useHomeFeed } from "@/hooks/use-home-feed";
import { useHomeRecent } from "@/hooks/use-home-recent";
import { useUserProfile } from "@/hooks/use-user-profile";

export default function HomeScreen() {
  const router = useRouter();
  const { playList, currentSong } = useMusic();
  const contentPadding = useContentPadding();

  const [profileSheetOpen, setProfileSheetOpen] = useState(false);

  const { userName, userEmail, userId, initials, gradient } = useUserProfile();
  const { recentVisible } = useHomeRecent(userId, currentSong?.id);
  const {
    newReleases,
    topAlbums,
    topTracks,
    newSingles,
    seedTracks,
    recoAlbums,
    recoBySeed,
    upcomingReleases,
    listenAgainAlbum,
    replaySongs,
    replayLoading,
    feedReady,
  } = useHomeFeed(userId);

  const { t } = useTranslation("home");

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(async () => {
      try {
        const lastClean = await AsyncStorage.getItem('cache:last-clean');
        const now = Date.now();
        const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;

        if (!lastClean || now - parseInt(lastClean) > THREE_DAYS) {
          console.log('[cache] Programando limpieza automatica...');

          setTimeout(async () => {
            await cleanExpiredCache();
            await AsyncStorage.setItem('cache:last-clean', String(now));
          }, 2000);
        }
      } catch (err) {
        console.warn('[cache] Error verificando limpieza:', err);
      }
    });

    return () => task.cancel();
  }, []);

  const mapTracksForPlayer = useCallback((arr: any[]) => {
    return arr.map((t: any) => ({
      id: String(t.id),
      title: t.title,
      artist_name: t.artist ?? "",
      artist: t.artist ?? "",
      artist_id: t.artist_id,
      album_id: t.album_id,
      album_name: t.album_name ?? t.album,
      thumbnail: t.thumb ?? t.thumbnail ?? t.thumbnail_url,
      thumbnail_url: t.thumb ?? t.thumbnail ?? t.thumbnail_url,
      duration: t.duration ?? null,
      duration_seconds: typeof t.duration_seconds === "number" ? t.duration_seconds : null,
      url: "",
    }));
  }, []);

  const mappedTopTracks = useMemo(() => mapTracksForPlayer(topTracks), [topTracks, mapTracksForPlayer]);
  const mappedNewSingles = useMemo(() => mapTracksForPlayer(newSingles), [newSingles, mapTracksForPlayer]);
  const mappedSeedTracks = useMemo(() => mapTracksForPlayer(seedTracks), [seedTracks, mapTracksForPlayer]);

  const items1 = useMemo(() => (recoBySeed[0]?.[1] || []), [recoBySeed]);
  const items2 = useMemo(() => (recoBySeed[1]?.[1] || []), [recoBySeed]);
  const seed1 = useMemo(() => {
    const s = items1?.[0]?.similar_to;
    return s ? { name: s.name, thumb: s.thumbnail } : null;
  }, [items1]);
  const seed2 = useMemo(() => {
    const s = items2?.[0]?.similar_to;
    return s ? { name: s.name, thumb: s.thumbnail } : null;
  }, [items2]);

  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setProfileSheetOpen(false);
      router.replace("/login");
    } catch (err) {
      console.warn("Error al cerrar sesion:", err);
    }
  }, [router]);

  return (
    <>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: "#0e0e0e" }}>
        <View style={{ paddingTop: 10, paddingHorizontal: 16, paddingBottom: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <TouchableOpacity
              onPress={() => setProfileSheetOpen(true)}
              activeOpacity={0.9}
              style={{ width: 38, height: 38, borderRadius: 19, overflow: "hidden" }}
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
                <Text style={{ color: "#fff", fontWeight: "800" }}>{initials}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {!feedReady || replayLoading ? (
        <HomeSkeleton />
      ) : (
        <>
          <ProList
            style={styles.container}
            contentContainerStyle={{
              ...contentPadding,
              paddingHorizontal: 8,
            }}
            bounces={false}
            overScrollMode="never"
            showsVerticalScrollIndicator={false}
            blockSize={2}
            initialBlocks={6}
          >
            <HomeFeatured
              replaySongs={replaySongs}
              replayLoading={replayLoading}
              listenAgainAlbum={listenAgainAlbum}
            />

            <RecentSection items={recentVisible} />

            <FeedSection
              title={t("sections.newReleases.title")}
              items={newReleases}
              type="album"
              feedKey="new-releases"
            />

            {!!items1.length && (
              <>
                <SimilarToHeader name={seed1?.name} thumb={seed1?.thumb} style={{ paddingHorizontal: 10, paddingTop: 4 }} />
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
                  onItemPress={(a) => router.push(`/(tabs)/home/artist/${encodeURIComponent(a.id)}`)}
                  cardWidth={120}
                  imageHeight={120}
                  circularImage
                  sectionStyle={{ marginTop: 2 }}
                />
              </>
            )}

            <FeedSection
              title={t("sections.topAlbums.title")}
              items={topAlbums}
              type="album"
              feedKey="top-albums"
            />

            <FeedSection
              title={t("sections.topTracks.title")}
              items={topTracks}
              type="track"
              variant="compact"
              feedKey="top-tracks"
              onTrackPress={(index, queueName) => {
                playList(mappedTopTracks, index, { type: "queue", name: queueName });
              }}
            />

            {!!items2.length && (
              <>
                <SimilarToHeader name={seed2?.name} thumb={seed2?.thumb} style={{ paddingHorizontal: 10, paddingTop: 4 }} />
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
                  onItemPress={(a) => router.push(`/(tabs)/home/artist/${encodeURIComponent(a.id)}`)}
                  cardWidth={120}
                  imageHeight={120}
                  circularImage
                  sectionStyle={{ marginTop: 2 }}
                />
              </>
            )}

            <FeedSection
              title={t("sections.newSingles.title")}
              items={newSingles}
              type="track"
              variant="compact"
              feedKey="new-singles"
              onTrackPress={(index, queueName) => {
                playList(mappedNewSingles, index, { type: "queue", name: queueName });
              }}
            />

            <FeedSection
              title={t("sections.fromSeed.title")}
              items={seedTracks}
              type="track"
              variant="compact"
              feedKey="seed-tracks"
              onTrackPress={(index, queueName) => {
                playList(mappedSeedTracks, index, { type: "queue", name: queueName });
              }}
            />

            <FeedSection
              title={t("sections.recoAlbums.title")}
              items={recoAlbums}
              type="album"
              feedKey="reco-albums"
            />

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
          </ProList>

          <TrackActionsSheet
            open={profileSheetOpen}
            onOpenChange={setProfileSheetOpen}
            track={null}
            headerTitle={t("account.title", { ns: "common" })}
            subtitle={`${userName || t("account.fallbackUser", { ns: "common" })}${userEmail ? " • " + userEmail : ""}`}
            showAddTo={false}
            showRemove={false}
            showShare={false}
            extraActions={[
              {
                key: "logout", label: t("account.signOut", { ns: "common" })
                , icon: "log-out-outline", onPress: handleSignOut
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
  section: { marginBottom: 20 },
});