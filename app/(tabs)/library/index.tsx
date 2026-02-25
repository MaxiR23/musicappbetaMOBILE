import CreatePlaylistModal from "@/components/shared/CreatePlaylistModal";
import LoadingView from "@/components/shared/LoadingView";
import ReleaseCard from "@/components/shared/ReleaseCard";
import ScreenHeader from "@/components/shared/ScreenHeader";
import { useContentPadding } from "@/hooks/use-content-padding";
import { useHomePlaylists } from "@/hooks/use-home-playlists";
import { useUserProfile } from "@/hooks/use-user-profile";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { FlatList, StatusBar, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function LibraryScreen() {
  const router = useRouter();
  const { userId } = useUserProfile();
  const insets = useSafeAreaInsets();
  const { playlistsWithCreate, refreshPlaylists } = useHomePlaylists(userId);
  const [createOpen, setCreateOpen] = useState(false);
  const contentPadding = useContentPadding();

  const playlists = playlistsWithCreate.filter(pl => !pl.isCreateButton);

  const renderPlaylist = useCallback(
    ({ item }: { item: any }) => {
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
          title={item.title || item.name || "Sin nombre"}
          onPress={() => router.push(`/(tabs)/library/playlist/${encodeURIComponent(item.id)}`)}
        />
      );
    },
    [router]
  );

  const keyExtractor = useCallback((item: any) => item.id, []);

  if (!userId) {
    return <LoadingView />;
  }

  return (
    <>
      <StatusBar barStyle="light-content" />
      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
        <ScreenHeader title="Tu biblioteca" />

        <FlatList
          data={playlists}
          keyExtractor={keyExtractor}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, justifyContent: "space-between" }}
           contentContainerStyle={[
            { padding: 12, gap: 12 },
            contentPadding 
          ]}
          renderItem={renderPlaylist}
          removeClippedSubviews={true}
          initialNumToRender={20}
          maxToRenderPerBatch={10}
          windowSize={5}
        />

        {/* Botón flotante */}
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