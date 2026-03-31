import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface AlbumInfoProps {
  title: string;
  artist_name?: string;
  artistThumb?: string;
  meta?: string;
  subtitle?: string;
  secondSubtitle?: string;
}

export default function AlbumInfo({
  title,
  artist_name,
  artistThumb,
  meta,
  subtitle,
  secondSubtitle,
}: AlbumInfoProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      {/* Avatar + Nombre de artista */}
      {!!artist_name && (
        <View style={styles.artistRow}>
          {!!artistThumb && (
            <Image source={artistThumb} style={styles.artistAvatar} />
          )}
          <Text style={styles.artist_name}>{artist_name}</Text>
        </View>
      )}

      {/* Meta info (año, canciones, duración) */}
      {!!meta && <Text style={styles.meta}>{meta}</Text>}

      {/* Subtítulos opcionales */}
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {!!secondSubtitle && <Text style={styles.subtitle}>{secondSubtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  artistRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  artistAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#333",
  },
  artist_name: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  meta: {
    fontSize: 13,
    color: "#bbb",
    marginTop: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#ccc",
    marginTop: 2,
  },
});