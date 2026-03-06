import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  artists: any[];
};

const getArtistFields = (artist: any, idx: number) => ({
  key: artist?.entity_id ?? artist?.id ?? String(idx),
  name: artist?.display_name ?? artist?.name ?? "Artista",
  thumbnail: artist?.thumbnail_url ?? artist?.thumbnail,
});

export default function MonthlyStatsCard({ artists }: Props) {
  const router = useRouter();

  if (!artists?.length) return null;

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.8}
      onPress={() => router.push("/(tabs)/home/stats")}
    >
      <View style={styles.artistsRow}>
        {artists.map((artist, idx) => {
          const { key, name, thumbnail } = getArtistFields(artist, idx);
          
          return (
            <View key={key} style={styles.artistItem}>
              <Image
                source={thumbnail ? { uri: thumbnail } : undefined}
                style={styles.artistImage}
              />
              <Text style={styles.artist_name} numberOfLines={1}>
                {name}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.label}>Tu mes en música</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 6,
    marginVertical: 12,
  },
  artistsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  artistItem: {
    alignItems: "center",
    flex: 1,
  },
  artistImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#333",
  },
  artist_name: {
    color: "#fff",
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
    maxWidth: 80,
  },
  label: {
    color: "#888",
    fontSize: 13,
    textAlign: "center",
    fontWeight: "500",
  },
});