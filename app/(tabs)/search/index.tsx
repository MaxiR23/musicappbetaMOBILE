import SearchPanel, { ResultItem } from "@/src/components/features/search/SearchPanel";
import { useMusic } from "@/src/hooks/use-music";
import { useMusicApi } from "@/src/hooks/use-music-api";
import { Stack, useRouter } from "expo-router";
import React from "react";

export default function SearchScreen() {
  const router = useRouter();
  const { searchSongs } = useMusicApi();
  const { playFromList } = useMusic();

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
        albumId: null,
      };
      playFromList([track] as any, 0, { type: "queue", name: null });
    } else if (item.type === "album") {
      router.push(`/(tabs)/home/album/${item.id}`);
    } else {
      router.push(`/(tabs)/home/artist/${item.id}`);
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
      <SearchPanel searchFn={searchFn} onSelect={onSelect} onClose={() => router.back()} />
    </>
  );
}