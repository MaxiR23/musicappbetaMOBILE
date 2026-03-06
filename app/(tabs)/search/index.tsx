import SearchPanel, { ResultItem } from "@/components/features/search/SearchPanel";
import { useContentPadding } from "@/hooks/use-content-padding";
import { useMusic } from "@/hooks/use-music";
import { useMusicApi } from "@/hooks/use-music-api";
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
        artist_name: item.artist_name ?? "",
        artist_id: item.artist_id ?? null,
        thumbnail: item.thumbnail ?? "",
        url: "",
        duration: item.duration,
        duration_seconds: item.duration_seconds ?? undefined,
        album_id: item.album_id ?? null,  
        album_name: item.album_name ?? undefined,
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