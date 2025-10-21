// components/playlist/PlaylistNormalView.tsx
import PlaybackButtons from "@/src/components/features/player/PlaybackButtons";
import TrackRow from "@/src/components/shared/TrackRow";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import PlaylistHeader from "./PlaylistHeader";

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
  onPlayAll,
  onShuffleAll,
  onTrackPress,
  onTrackMorePress,
  onMenuPress,
}: PlaylistNormalViewProps) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Hero Header */}
      <PlaylistHeader
        playlist={playlist}
        mosaicImages={mosaicImages}
        onMenuPress={onMenuPress}
      />

      {/* Playback Buttons */}
      <PlaybackButtons onPlay={onPlayAll} onShuffle={onShuffleAll} />

      {/* Track List */}
      <View style={{ paddingHorizontal: 16 }}>
        {playlist.songs.map((song: any, index: number) => (
          <TrackRow
            key={`${song.id}-${index}`}
            index={index + 1}
            title={song.title}
            artist={song.artist}
            thumbnail={song.albumCover}
            onPress={() => onTrackPress(index)}
            onMorePress={() => onTrackMorePress(mappedSongs[index], index)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0e0e0e",
  },
});