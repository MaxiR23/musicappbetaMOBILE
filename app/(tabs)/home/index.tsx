import ProList from "@/src/components/shared/ProList";
import { useMusic } from "@/src/hooks/use-music";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  InteractionManager,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { cleanExpiredCache } from '@/src/utils/cache';
import AsyncStorage from '@react-native-async-storage/async-storage';

import HomeBanner from "@/src/components/features/home/HomeBanner";
import RecentSection from "@/src/components/features/home/RecentSection";
import TrackActionsSheet from "@/src/components/shared/TrackActionsSheet";
import { supabase } from "@/src/lib/supabase";

import HorizontalScrollSection from "@/src/components/shared/HorizontalScrollSection";

import FeedSection from "@/src/components/features/home/FeedSection";
import SimilarToHeader from "@/src/components/shared/SimilarToHeader";
import { useContentPadding } from "@/src/hooks/use-content-padding";
import { useHomeFeed } from "@/src/hooks/use-home-feed";
import { useHomeRecent } from "@/src/hooks/use-home-recent";
import { useUserProfile } from "@/src/hooks/use-user-profile";

export default function HomeScreen() {
  const router = useRouter();
  const { playFromList, currentSong } = useMusic();
  const contentPadding = useContentPadding();

  const [createOpen, setCreateOpen] = useState(false);
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
  } = useHomeFeed(userId);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(async () => {
      try {
        const lastClean = await AsyncStorage.getItem('cache:last-clean');
        const now = Date.now();
        const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;

        if (!lastClean || now - parseInt(lastClean) > THREE_DAYS) {
          console.log('[cache] Programando limpieza automática...');

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
      artistName: t.artist ?? "",
      artist: t.artist ?? "",
      artistId: t.artist_id ?? t.artistId,
      artist_id: t.artist_id ?? t.artistId ?? null,
      thumbnail: t.thumb ?? t.thumbnail,
      thumbnail_url: t.thumb ?? t.thumbnail,
      duration: t.duration ?? null,
      durationSeconds: typeof t.duration_s === "number" ? t.duration_s : null,
      url: "",
    }));
  }, []);

  const mappedTopTracks = useMemo(() => mapTracksForPlayer(topTracks), [topTracks, mapTracksForPlayer]);
  const mappedNewSingles = useMemo(() => mapTracksForPlayer(newSingles), [newSingles, mapTracksForPlayer]);
  const mappedSeedTracks = useMemo(() => mapTracksForPlayer(seedTracks), [seedTracks, mapTracksForPlayer]);

  // ── tomar 2 seeds para ubicar bloques ──
  const items1 = useMemo(() => (recoBySeed[0]?.[1] || []), [recoBySeed]);
  const items2 = useMemo(() => (recoBySeed[1]?.[1] || []), [recoBySeed]);
  const seed1 = useMemo(() => {
    const s = items1?.[0]?.similarTo;
    return s ? { name: s.name, thumb: s.thumbnail } : null;
  }, [items1]);
  const seed2 = useMemo(() => {
    const s = items2?.[0]?.similarTo;
    return s ? { name: s.name, thumb: s.thumbnail } : null;
  }, [items2]);

  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setProfileSheetOpen(false);
      router.replace("/login");
    } catch (err) {
      console.warn("Error al cerrar sesión:", err);
    }
  }, [router]);

  return (
    <>
      {/* 🔍 Barra de búsqueda */}
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

      {/* contenido */}
      <ProList
        style={styles.container}
        contentContainerStyle={contentPadding}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        blockSize={2}
        initialBlocks={3}
      >
        {/* banner */}
        <HomeBanner />

        {/* TODO: CHECK OLD CODE BELOW, if decided to be unused archived or delete PlaylistSection { */}

        {/* playlists */}
        {/* <PlaylistsSection
          playlists={playlistsWithCreate}
          onCreatePress={() => setCreateOpen(true)}
        /> */}

        {/* } */}

        {/* escuchados recientemente */}
        <RecentSection items={recentVisible} />

        {/* nuevos lanzamientos (álbumes) */}
        <FeedSection
          title="Nuevos lanzamientos"
          items={newReleases}
          type="album"
          feedKey="new-releases"
        />

        {/* similar to (1) */}
        {!!items1.length && (
          <>
            <SimilarToHeader name={seed1?.name} thumb={seed1?.thumb} style={{ paddingHorizontal: 10, paddingTop: 4 }} />
            <HorizontalScrollSection
              title={""}
              items={items1}
              keyExtractor={(a, idx) => `${a.id}-${idx}`}
              imageExtractor={(a) =>
                Array.isArray(a.thumbnails) && a.thumbnails.length
                  ? a.thumbnails[a.thumbnails.length - 1]?.url
                  : undefined
              }
              titleExtractor={(a) => a.name}
              subtitleExtractor={() => "Artista"}
              onItemPress={(a) => router.push(`/(tabs)/home/artist/${encodeURIComponent(a.id)}`)}
              cardWidth={120}
              imageHeight={120}
              circularImage
              sectionStyle={{ marginTop: 2 }}
            />
          </>
        )}

        {/* más escuchados · Álbumes */}
        <FeedSection
          title="Más escuchados · Álbumes"
          items={topAlbums}
          type="album"
          feedKey="top-albums"
        />

        {/* más escuchados · Canciones */}
        <FeedSection
          title="Más escuchados · Canciones"
          items={topTracks}
          type="track"
          feedKey="top-tracks"
          onTrackPress={(index, queueName) => {
            playFromList(mappedTopTracks, index, { type: "queue", name: queueName });
          }}
        />

        {/* similar to (2) */}
        {!!items2.length && (
          <>
            <SimilarToHeader name={seed2?.name} thumb={seed2?.thumb} style={{ paddingHorizontal: 10, paddingTop: 4 }} />
            <HorizontalScrollSection
              title={""}
              items={items2}
              keyExtractor={(a, idx) => `${a.id}-${idx}`}
              imageExtractor={(a) =>
                Array.isArray(a.thumbnails) && a.thumbnails.length
                  ? a.thumbnails[a.thumbnails.length - 1]?.url
                  : undefined
              }
              titleExtractor={(a) => a.name}
              subtitleExtractor={() => "Artista"}
              onItemPress={(a) => router.push(`/(tabs)/home/artist/${encodeURIComponent(a.id)}`)}
              cardWidth={120}
              imageHeight={120}
              circularImage
              sectionStyle={{ marginTop: 2 }}
            />
          </>
        )}

        {/* WIP - TODO: FIX NEW SINGLES IN BACKEND */}
        {/* singles nuevos */}
        <FeedSection
          title="Singles nuevos"
          items={newSingles}
          type="track"
          feedKey="new-singles"
          onTrackPress={(index, queueName) => {
            playFromList(mappedNewSingles, index, { type: "queue", name: queueName });
          }}
        />

        {/* seed tracks */}
        <FeedSection
          title="Desde tu seed"
          items={seedTracks}
          type="track"
          feedKey="seed-tracks"
          onTrackPress={(index, queueName) => {
            playFromList(mappedSeedTracks, index, { type: "queue", name: queueName });
          }}
        />

        {/* albumes recomendados */}
        <FeedSection
          title="Álbumes recomendados"
          items={recoAlbums}
          type="album"
          feedKey="reco-albums"
        />

      </ProList>

      {/* submenú avatar */}
      <TrackActionsSheet
        open={profileSheetOpen}
        onOpenChange={setProfileSheetOpen}
        track={null}
        headerTitle="Cuenta"
        subtitle={`${userName || "Usuario"}${userEmail ? " • " + userEmail : ""}`}
        showAddTo={false}
        showRemove={false}
        showShare={false}
        extraActions={[
          { key: "logout", label: "Cerrar sesión", icon: "log-out-outline", onPress: handleSignOut },
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0e0e0e", padding: 10 },
  section: { marginBottom: 20 },
});