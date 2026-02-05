// src/hooks/use-content-padding.ts
import { useMemo } from 'react';
import { useMusic } from './use-music';

export function useContentPadding() {
  const { currentSong } = useMusic();
  
  return useMemo(() => ({
    paddingBottom: currentSong ? 150 : 80,
    fabBottom: currentSong ? 140 : 70,
  }), [currentSong]);
}