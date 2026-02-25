import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

interface AlbumInfoProps {
  title: string;
  artistName?: string;
  artistThumb?: string;
  meta?: string;
  subtitle?: string;
  secondSubtitle?: string;
}

export default function AlbumInfo({
  title,
  artistName,
  artistThumb,
  meta,
  subtitle,
  secondSubtitle,
}: AlbumInfoProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      {/* Avatar + Nombre de artista */}
      {!!artistName && (
        <View style={styles.artistRow}>
          {!!artistThumb && (
            <Image source={{ uri: artistThumb }} style={styles.artistAvatar} />
          )}
          <Text style={styles.artistName}>{artistName}</Text>
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
  artistName: {
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