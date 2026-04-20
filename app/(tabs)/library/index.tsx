import CreatePlaylistModal from "@/components/shared/CreatePlaylistModal";
import LoadingView from "@/components/shared/LoadingView";
import ReleaseCard from "@/components/shared/ReleaseCard";
import ScreenHeader from "@/components/shared/ScreenHeader";
import { useContentPadding } from "@/hooks/use-content-padding";
import { useHomePlaylists } from "@/hooks/use-home-playlists";
import { useLibrary } from "@/hooks/use-library";
import { useUserProfile } from "@/hooks/use-user-profile";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, StatusBar, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function LibraryScreen() {
  const router = useRouter();
  const { userId } = useUserProfile();
  const insets = useSafeAreaInsets();
  const { playlistsWithCreate, refreshPlaylists } = useHomePlaylists(userId);
  const [createOpen, setCreateOpen] = useState(false);
  const contentPadding = useContentPadding();
  const { t } = useTranslation("library");

  const { albums: libraryAlbums, playlists: libraryPlaylists } = useLibrary();

  const ownedPlaylists = playlistsWithCreate.filter(pl => !pl.isCreateButton);

  const data = useMemo(() => {
    const likedItem = {
      id: "liked",
      title: t("liked"),
      isLiked: true,
    };

    const mappedAlbums = libraryAlbums.map((a) => ({
      id: `album:${a.external_id}`,
      title: a.title,
      subtitle: a.artist,
      thumbnail_url: a.thumbnail_url,
      isLibraryAlbum: true,
      external_id: a.external_id,
    }));

    const mappedExternalPlaylists = libraryPlaylists.map((p) => ({
      id: `ext-playlist:${p.external_id}`,
      title: p.title,
      subtitle: p.artist,
      thumbnail_url: p.thumbnail_url,
      isLibraryPlaylist: true,
      external_id: p.external_id,
    }));

    return [likedItem, ...ownedPlaylists, ...mappedAlbums, ...mappedExternalPlaylists];
  }, [ownedPlaylists, libraryAlbums, libraryPlaylists, t]);

  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      if (item.isLiked) {
        return (
          <ReleaseCard
            cover={require("@/assets/images/liked-cover.png")}
            title={item.title}
            onPress={() => router.push("/(tabs)/library/playlist/liked")}
          />
        );
      }

      if (item.isLibraryAlbum) {
        return (
          <ReleaseCard
            cover={item.thumbnail_url || null}
            title={item.title}
            subtitle={item.subtitle}
            onPress={() => router.push(`/(tabs)/library/album/${encodeURIComponent(item.external_id)}`)}
          />
        );
      }

      if (item.isLibraryPlaylist) {
        return (
          <ReleaseCard
            cover={item.thumbnail_url || null}
            title={item.title}
            subtitle={item.subtitle}
            onPress={() => router.push(`/(tabs)/library/playlist/${encodeURIComponent(item.external_id)}`)}
          />
        );
      }

      const imagesFromTracks = (item?.playlist_tracks || [])
        .map((t: any) => t?.tracks?.thumbnail_url || t?.thumbnail_url)
        .filter(Boolean);
      const thumbnails = item?.cover_url
        ? [item.cover_url, ...imagesFromTracks]
        : imagesFromTracks;

      return (
        <ReleaseCard
          thumbnails={thumbnails.length > 0 ? thumbnails : undefined}
          cover={null}
          title={item.title || item.name || t("untitled")}
          onPress={() => router.push(`/(tabs)/library/playlist/${encodeURIComponent(item.id)}`)}
        />
      );
    },
    [router, t]
  );

  const keyExtractor = useCallback((item: any) => item.id, []);

  if (!userId) {
    return <LoadingView />;
  }

  return (
    <>
      <StatusBar barStyle="light-content" />
      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
        <ScreenHeader title={t("header")} />

        <FlatList
          data={data}
          keyExtractor={keyExtractor}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, justifyContent: "space-between" }}
          contentContainerStyle={[
            { padding: 12, gap: 12 },
            contentPadding
          ]}
          renderItem={renderItem}
          removeClippedSubviews={true}
          initialNumToRender={20}
          maxToRenderPerBatch={10}
          windowSize={5}
        />

        <TouchableOpacity
          style={[styles.fab, { bottom: contentPadding.fabBottom }]}
          onPress={() => setCreateOpen(true)}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <CreatePlaylistModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={refreshPlaylists}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0e0e0e",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 90,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#4facfe",
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});