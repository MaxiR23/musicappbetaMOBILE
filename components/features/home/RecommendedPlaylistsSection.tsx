import PlaylistCover from "@/components/features/playlist/PlaylistCover";
import HorizontalScrollSection from "@/components/shared/HorizontalScrollSection";
import { useRouter } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity } from "react-native";

// TODO: subtitle — actualmente muestra "{matching_artists} artists you listen to"
// Alternativas para mostrar en el subtitle:
// {p.total_tracks} {t("sections.recommendedPlaylists.tracks")} -> "72 tracks"
//   + agregar key "tracks" en i18n: en/home.json y es/home.json
// {'Beatly Music'} -> branding fijo, no necesita i18n
export default function RecommendedPlaylistsSection({ playlists }: { playlists: any[] }) {
  const { t } = useTranslation("home");
  const router = useRouter();

  if (!playlists.length) return null;

  return (
    <HorizontalScrollSection
      title={t("sections.recommendedPlaylists.title")}
      items={playlists}
      keyExtractor={(p: any, idx) => `${p.playlist_id}-${idx}`}
      cardWidth={120}
      renderItem={(p: any) => (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push(`/(tabs)/home/genre-playlist/${encodeURIComponent(p.playlist_id)}`)}
          style={{ width: 120 }}
        >
          <PlaylistCover images={p.thumbnails || []} size={120} borderRadius={8} />
          <Text style={{ color: "#fff", fontWeight: "600", marginTop: 6, fontSize: 13 }} numberOfLines={1}>
            {p.playlist_title}
          </Text>
          <Text style={{ color: "#aaa", fontSize: 11, marginTop: 2 }} numberOfLines={1}>
            {p.matching_artists} {t("sections.recommendedPlaylists.artistsMatch")}
          </Text>
        </TouchableOpacity>
      )}
    />
  );
}