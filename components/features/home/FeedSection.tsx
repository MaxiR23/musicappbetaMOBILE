import { useRouter } from 'expo-router';
import React from 'react';
import HorizontalScrollSection from '../../shared/HorizontalScrollSection';

interface Props {
  title: string;
  items: any[];
  type: 'album' | 'track';
  onTrackPress?: (index: number, queueName: string) => void;
  feedKey?: string;
}

export default function FeedSection({ title, items, type, onTrackPress, feedKey }: Props) {
  const router = useRouter();

  if (items.length === 0) return null;

  const isTrack = type === 'track';

  return (
    <HorizontalScrollSection
      title={title}
      items={items}
      keyExtractor={(item) => String(item.id)}
      imageExtractor={(item) => {
        if (item.thumb || item.thumbnail) {
          return item.thumb ?? item.thumbnail;
        }
        if (Array.isArray(item.thumbnails) && item.thumbnails.length) {
          return item.thumbnails[item.thumbnails.length - 1]?.url;
        }
        return undefined;
      }}
      titleExtractor={(item) => item.title ?? item.name}
      subtitleExtractor={(item) => item.artist ?? item.artist_name}
      onItemPress={(item, index) => {
        if (isTrack && onTrackPress) {
          onTrackPress(index, title);
        } else {
          router.push(`/(tabs)/home/album/${encodeURIComponent(item.id)}`);
        }
      }}
      has_more={!!feedKey}
      onPressMore={feedKey ? () => router.push({ pathname: '/(tabs)/home/feed-list', params: { key: feedKey, title } }) : undefined}
      cardWidth={120}
      imageHeight={120}
      circularImage={false}
    />
  );
}