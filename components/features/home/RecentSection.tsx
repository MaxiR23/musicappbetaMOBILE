import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInRight, LinearTransition } from 'react-native-reanimated';
import HorizontalScrollSection from './../../shared/HorizontalScrollSection';

type RecentItem = {
  type: "album" | "artist" | "playlist";
  id: string;
  played_at: string;
  name?: string | null;
  artist_name?: string | null;
  thumbnail_url?: string | null;
};
interface Props {
  items: RecentItem[];
}

export default function RecentSection({ items }: Props) {
  const { t } = useTranslation("home");
  const router = useRouter();

  // Track previos items para animar solo los nuevos.
  // SEE: https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/list-layout-animations/
  // SEE: https://github.com/software-mansion/react-native-reanimated/discussions/6748
  const mountedRef = useRef(false);
  const prevPlayedAtsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    mountedRef.current = true;
    prevPlayedAtsRef.current = new Set(items.map((it) => it.played_at));
  }, [items]);

  if (items.length === 0) return null;

  return (
    <HorizontalScrollSection
      title={t("sections.recents.title")}
      items={items}
      keyExtractor={(it, idx) => `${it.type}:${it.id}:${it.played_at}:${idx}`}
      imageExtractor={() => ""}
      titleExtractor={() => ""}
      onItemPress={() => { }}
      cardWidth={120}
      imageHeight={120}
      has_more={items.length > 6}
      onPressMore={() => router.push({ pathname: '/(tabs)/home/feed-list', params: { key: 'recents', title: t("sections.recents.title") } })}
      renderItem={(it) => {
        const SIZE = 120;
        const isArtist = it.type === "artist";
        const radius = isArtist ? SIZE / 2 : 16;
        const isNew = mountedRef.current && !prevPlayedAtsRef.current.has(it.played_at);

        const content = (
          <TouchableOpacity
            style={{ width: SIZE }}
            onPress={() =>
              router.push(
                isArtist
                  ? `/(tabs)/home/artist/${encodeURIComponent(it.id)}`
                  : `/(tabs)/home/album/${encodeURIComponent(it.id)}`
              )
            }
            activeOpacity={0.85}
          >
            <View
              style={{
                width: SIZE,
                height: SIZE,
                borderRadius: radius,
                overflow: "hidden",
                backgroundColor: "#333",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {it.thumbnail_url ? (
                <Image source={it.thumbnail_url} style={{ width: SIZE, height: SIZE }} />
              ) : (
                <Ionicons name="musical-notes-outline" size={22} color="#777" />
              )}
            </View>

            {!!it.name && (
              <Text numberOfLines={1} style={{ color: "#fff", marginTop: 6, width: SIZE, fontWeight: "600", fontSize: 13 }}>
                {it.name}
              </Text>
            )}
            <Text style={{ color: "#aaa", width: SIZE, fontSize: 11 }} numberOfLines={1}>
              {isArtist
                ? t("sections.recents.artistLabel")
                : it.artist_name
                  ? `${t("sections.recents.albumLabel")} • ${it.artist_name}`
                  : t("sections.recents.albumLabel")
              }
            </Text>
          </TouchableOpacity>
        );

        return (
          <Animated.View
            layout={LinearTransition.duration(400)}
            entering={isNew ? FadeInRight.duration(500) : undefined}
          >
            {content}
          </Animated.View>
        );
      }}
    />
  );
}