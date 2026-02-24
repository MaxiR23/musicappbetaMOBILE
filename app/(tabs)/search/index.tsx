import SearchPanel, { ResultItem } from "@/src/components/features/search/SearchPanel";
import { useContentPadding } from "@/src/hooks/use-content-padding";
import { useMusic } from "@/src/hooks/use-music";
import { useMusicApi } from "@/src/hooks/use-music-api";
import { Stack, useRouter } from "expo-router";
import React from "react";

export default function SearchScreen() {
  const router = useRouter();
  const { searchSongs } = useMusicApi();
  const { playFromSearch } = useMusic();
  const contentPadding = useContentPadding();

  const searchFn = async (q: string) => await searchSongs(q);

  const onSelect = (item: ResultItem) => {
    if (item.type === "song") {
      const track = {
        id: item.id,
        title: item.title,
        artistName: item.artistName ?? "",
        artistId: item.artistId ?? null,
        thumbnail: item.thumbnail ?? "",
        url: "",
        duration: item.duration,
        durationSeconds: undefined,
        albumId: item.albumId ?? null,  
        albumName: item.albumName ?? undefined,
      };
      playFromSearch(track as any);
    } else if (item.type === "album") {
      router.push(`/(tabs)/search/album/${item.id}`);
    } else {
      router.push(`/(tabs)/search/artist/${item.id}`);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          animation: "none",
          fullScreenGestureEnabled: true,
          contentStyle: { backgroundColor: "#0f0f0f" },
        }}
      />
      <SearchPanel searchFn={searchFn} onSelect={onSelect} onClose={() => router.replace("/(tabs)/search")} contentPadding={contentPadding} />
    </>
  );
}