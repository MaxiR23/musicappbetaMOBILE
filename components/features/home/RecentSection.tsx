import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import HorizontalScrollSection from './../../shared/HorizontalScrollSection';

type RecentItem = {
  type: "album" | "artist" | "playlist";
  id: string;
  played_at: string;
  name?: string | null;
  thumbnail_url?: string | null;
};
interface Props {
  items: RecentItem[];
}

export default function RecentSection({ items }: Props) {
  const { t } = useTranslation("home");
  const router = useRouter();

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

        return (
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
                <Image source={{ uri: it.thumbnail_url }} style={{ width: SIZE, height: SIZE }} />
              ) : (
                <Ionicons name="musical-notes-outline" size={22} color="#777" />
              )}
            </View>

            {!!it.name && (
              <Text numberOfLines={1} style={{ color: "#fff", marginTop: 6, width: SIZE, fontWeight: "600", fontSize: 13 }}>
                {it.name}
              </Text>
            )}
            <Text style={{ color: "#aaa", width: SIZE, fontSize: 11 }}>
              {isArtist ? t("sections.recents.artistLabel") : t("sections.recents.albumLabel")}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}