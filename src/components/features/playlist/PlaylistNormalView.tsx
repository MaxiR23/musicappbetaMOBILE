// components/playlist/PlaylistNormalView.tsx
import PlaybackButtons from "@/src/components/features/player/PlaybackButtons";
import TrackRow from "@/src/components/shared/TrackRow";
import React from "react";
import { FlatList, StyleSheet, View } from "react-native";
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
    <FlatList
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      data={playlist.songs || []}
      keyExtractor={(song: any, index: number) => `${song.id}-${index}`}
      renderItem={({ item: song, index }) => (
        <View style={{ paddingHorizontal: 16 }}>
          <TrackRow
            index={index + 1}
            title={song.title}
            artist={song.artist}
            thumbnail={song.albumCover}
            trackId={song.id}
            showIndex={false}
            onPress={() => onTrackPress(index)}
            onMorePress={() => onTrackMorePress(mappedSongs[index], index)}
          />
        </View>
      )}
      ListHeaderComponent={
        <>
          {/* Hero Header */}
          <PlaylistHeader
            variant="default"
            playlist={playlist}
            mosaicImages={mosaicImages}
            onMenuPress={onMenuPress}
          />

          {/* Playback Buttons */}
          <PlaybackButtons onPlay={onPlayAll} onShuffle={onShuffleAll} />
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0e0e0e",
  },
});