import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import PlaylistCover from '../features/playlist/PlaylistCover';
import HorizontalScrollSection from '../shared/HorizontalScrollSection';

interface Props {
  playlists: any[];
  onCreatePress: () => void;
}

export default function PlaylistsSection({ playlists, onCreatePress }: Props) {
  const router = useRouter();

  return (
    <HorizontalScrollSection
      title="Tus playlists"
      items={playlists}
      keyExtractor={(pl) => String(pl.id)}
      imageExtractor={() => ""}
      titleExtractor={() => ""}
      onItemPress={() => {}}
      cardWidth={140}
      imageHeight={140}
      renderItem={(pl) => {
        if (pl.isCreateButton) {
          return (
            <TouchableOpacity
              style={{ 
                width: 140, 
                height: 140, 
                borderRadius: 16, 
                backgroundColor: "#1a1a1a", 
                alignItems: "center", 
                justifyContent: "center" 
              }}
              onPress={onCreatePress}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={28} color="#fff" />
              <Text style={{ color: "#fff", marginTop: 8, fontWeight: "600", fontSize: 13 }}>
                Crear playlist
              </Text>
            </TouchableOpacity>
          );
        }

        const imagesFromTracks = (pl?.playlist_tracks || [])
          .map((t: any) => t?.tracks?.thumbnail_url || t?.thumbnail_url)
          .filter(Boolean);
        const images = pl?.cover_url ? [pl.cover_url, ...imagesFromTracks] : imagesFromTracks;
        const SIZE = 140, RADIUS = 16;

        return (
          <TouchableOpacity
            style={{ width: SIZE }}
            onPress={() => router.push(`/(tabs)/home/playlist/${encodeURIComponent(pl.id)}`)}
            activeOpacity={0.8}
          >
            <View
              style={{
                width: SIZE,
                height: SIZE,
                borderRadius: RADIUS,
                overflow: "hidden",
                backgroundColor: "#1a1a1a",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {images.length > 0 ? (
                <PlaylistCover images={images} size={SIZE} borderRadius={RADIUS} />
              ) : (
                <Ionicons name="musical-notes" size={28} color="#777" />
              )}
            </View>

            {!!(pl?.title || pl?.name) && (
              <Text 
                numberOfLines={1} 
                style={{ 
                  color: "#fff", 
                  marginTop: 6, 
                  width: SIZE, 
                  fontWeight: "600", 
                  fontSize: 13, 
                  marginLeft: 8 
                }}
              >
                {pl.title ?? pl.name}
              </Text>
            )}
          </TouchableOpacity>
        );
      }}
    />
  );
}