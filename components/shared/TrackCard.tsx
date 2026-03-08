import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface TrackCardProps {
  title: string;
  artist?: string;
  thumbnail?: string;
  rank?: number;
  subtitle?: string;
  onPress?: () => void;
  onMorePress?: () => void;
  width?: number;
}

export default function TrackCard({
  title,
  artist,
  thumbnail,
  rank,
  subtitle,
  onPress,
  onMorePress,
  width = 220,
}: TrackCardProps) {
  return (
    <TouchableOpacity
      style={[styles.container, { width }]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={styles.imageContainer}>
        {thumbnail ? (
          <Image source={{ uri: thumbnail }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.placeholder]} />
        )}
      </View>

      {rank !== undefined && (
        <Text style={styles.rank}>{rank}</Text>
      )}

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {[artist, subtitle].filter(Boolean).join(" · ")}
        </Text>
      </View>

      {onMorePress && (
        <TouchableOpacity
          onPress={onMorePress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="ellipsis-horizontal" size={18} color="#888" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    padding: 8,
    gap: 10,
  },
  imageContainer: {
    width: 48,
    height: 48,
    borderRadius: 6,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    backgroundColor: "#2a2a2a",
  },
  rank: {
    color: "#666",
    fontSize: 14,
    fontWeight: "700",
    width: 18,
    textAlign: "center",
  },
  info: {
    flex: 1,
  },
  title: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  subtitle: {
    color: "#888",
    fontSize: 12,
    marginTop: 2,
  },
});