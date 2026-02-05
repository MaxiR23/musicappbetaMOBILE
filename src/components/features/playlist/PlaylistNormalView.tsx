// components/playlist/PlaylistNormalView.tsx
import PlaybackButtons from "@/src/components/features/player/PlaybackButtons";
import AnimatedHeaderTest from "@/src/components/shared/AnimatedHeaderTest";
import TrackRow from "@/src/components/shared/TrackRow";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface PlaylistNormalViewProps {
  playlist: {
    name: string;
    description?: string;
    isPublic: boolean;
    songCount: number;
    duration: string;
    songs: any[];
  };
  mosaicImages: string[];
  mappedSongs: any[];
  contentPadding?: { paddingBottom: number };
  onPlayAll: () => void;
  onShuffleAll: () => void;
  onTrackPress: (index: number) => void;
  onTrackMorePress: (track: any, index: number) => void;
  onMenuPress: () => void;
}

export default function PlaylistNormalView({
  playlist,
  mosaicImages,
  mappedSongs,
  contentPadding,
  onPlayAll,
  onShuffleAll,
  onTrackPress,
  onTrackMorePress,
  onMenuPress,
}: PlaylistNormalViewProps) {
  const router = useRouter();

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: "#0e0e0e" }}>
      <AnimatedHeaderTest
        mosaicImages={mosaicImages}
        title={playlist.name}
        onBackPress={() => router.back()}
        onMenuPress={onMenuPress}
        contentContainerStyle={contentPadding}
      >
        {/* Info del playlist */}
        <View style={styles.playlistInfo}>
          <Text style={styles.playlistTitle} numberOfLines={2}>
            {playlist.name}
          </Text>
          {!!playlist.description && (
            <Text style={styles.playlistDescription} numberOfLines={2}>
              {playlist.description}
            </Text>
          )}
          <Text style={styles.playlistMeta}>
            {playlist.isPublic ? "PLAYLIST PÚBLICA" : "PLAYLIST PRIVADA"} • {playlist.songCount} canciones • {playlist.duration}
          </Text>
        </View>

        {/* Playback Buttons */}
        <PlaybackButtons onPlay={onPlayAll} onShuffle={onShuffleAll} />

        {/* Songs */}
        <View style={{ paddingHorizontal: 16 }}>
          {(playlist.songs || []).map((song: any, index: number) => (
            <TrackRow
              key={`${song.id}-${index}`}
              index={index + 1}
              title={song.title}
              artist={song.artist}
              thumbnail={song.albumCover}
              trackId={song.id}
              showIndex={false}
              onPress={() => onTrackPress(index)}
              onMorePress={() => onTrackMorePress(mappedSongs[index], index)}
            />
          ))}
        </View>
      </AnimatedHeaderTest>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0e0e0e",
  },
  playlistInfo: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    alignItems: "center",
  },
  playlistTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginBottom: 6,
  },
  playlistDescription: {
    fontSize: 14,
    color: "#ddd",
    textAlign: "center",
    marginBottom: 6,
  },
  playlistMeta: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
  },
});