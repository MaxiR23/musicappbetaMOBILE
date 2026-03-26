import { useLikes } from "@/hooks/use-likes";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import TrackActionsSheet from "./TrackActionsSheet";

interface TrackCardProps {
  title: string;
  artist?: string;
  thumbnail?: string;
  rank?: number;
  subtitle?: string;
  onPress?: () => void;
  onMorePress?: () => void;
  width?: number;
  trackId?: string | number;
  track?: any;
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
  trackId,
  track,
}: TrackCardProps) {
  const { isLiked } = useLikes();
  const resolvedTrackId = trackId ?? track?.id;
  const liked = resolvedTrackId ? isLiked(String(resolvedTrackId)) : false;

  const [actionsOpen, setActionsOpen] = useState(false);

  const handleMorePress = useCallback(() => {
    if (onMorePress) {
      onMorePress();
      return;
    }
    if (track) {
      setActionsOpen(true);
    }
  }, [onMorePress, track]);

  return (
    <>
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

        {liked && (
          <Ionicons name="heart" size={12} color="#888" style={{ marginRight: 2 }} />
        )}

        {(onMorePress || track) && (
          <TouchableOpacity
            onPress={handleMorePress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="ellipsis-vertical" size={16} color="#bbb" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {track && (
        <TrackActionsSheet
          open={actionsOpen}
          onOpenChange={setActionsOpen}
          track={track}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    borderRadius: 8,
    padding: 4,
    gap: 8,
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