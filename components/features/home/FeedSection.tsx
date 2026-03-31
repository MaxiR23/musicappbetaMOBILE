import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { View } from 'react-native';
import HorizontalScrollSection from '../../shared/HorizontalScrollSection';
import TrackCard from '../../shared/TrackCard';

interface Props {
  title: string;
  items: any[];
  type: 'album' | 'track';
  variant?: 'grid' | 'compact';
  onTrackPress?: (index: number, queueName: string) => void;
  feedKey?: string;
  disablePress?: boolean;
}

export default function FeedSection({
  title,
  items,
  type,
  variant = 'grid',
  onTrackPress,
  feedKey,
  disablePress
}: Props) {
  const router = useRouter();

  if (items.length === 0) return null;

  const isTrack = type === 'track';
  const isCompact = variant === 'compact' && isTrack;

  const extractThumbnail = (item: any) => {
    if (item.thumb || item.thumbnail) {
      return item.thumb ?? item.thumbnail;
    }
    if (Array.isArray(item.thumbnails) && item.thumbnails.length) {
      return item.thumbnails[item.thumbnails.length - 1]?.url;
    }
    return undefined;
  };

  const chunkedItems = useMemo(() => {
    if (!isCompact) return [];
    const chunks: any[][] = [];
    for (let i = 0; i < items.length; i += 4) {
      chunks.push(items.slice(i, i + 4));
    }
    return chunks;
  }, [items, isCompact]);

  if (isCompact) {
    return (
      <HorizontalScrollSection
        title={title}
        items={chunkedItems}
        keyExtractor={(_, idx) => `chunk-${idx}`}
        renderItem={(chunk, chunkIndex) => (
          <View style={{ gap: 8 }}>
            {chunk.map((item: any, idx: number) => {
              const globalIndex = chunkIndex * 4 + idx;
              return (
                <TrackCard
                  key={String(item.id)}
                  title={item.title ?? item.name}
                  artist={item.artist ?? item.artist_name}
                  thumbnail={extractThumbnail(item)}
                  track={item}
                  onPress={() => onTrackPress?.(globalIndex, title)}
                />
              );
            })}
          </View>
        )}
        has_more={!!feedKey}
        onPressMore={
          feedKey
            ? () => router.push({ pathname: '/(tabs)/home/feed-list', params: { key: feedKey, title } })
            : undefined
        }
        cardWidth={220}
      />
    );
  }

  return (
    <HorizontalScrollSection
      title={title}
      items={items}
      keyExtractor={(item) => String(item.id)}
      imageExtractor={extractThumbnail}
      titleExtractor={(item) => item.title ?? item.name}
      subtitleExtractor={(item) => item.artist ?? item.artist_name}
      onItemPress={
        disablePress
          ? undefined
          : (item, index) => {
            if (isTrack && onTrackPress) {
              onTrackPress(index, title);
            } else {
              router.push(`/(tabs)/home/album/${encodeURIComponent(item.id)}`);
            }
          }
      }
      has_more={!!feedKey}
      onPressMore={
        feedKey
          ? () => router.push({ pathname: '/(tabs)/home/feed-list', params: { key: feedKey, title } })
          : undefined
      }
      cardWidth={120}
      imageHeight={120}
      circularImage={false}
    />
  );
}