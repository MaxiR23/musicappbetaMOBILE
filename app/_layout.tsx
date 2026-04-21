import "@/i18n";
import "@/lib/db";
import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import AuthContainer from "@/components/features/auth/AuthContainer";
import { useAuth } from "@/hooks/use-auth";
import AuthProvider from "@/providers/AuthProvider";
import CacheVersionsProvider from "@/providers/CacheVersionsProvider";

import MusicPlayer from "@/components/features/player/MusicPlayer";
import { MusicProvider } from "@/providers/MusicProvider";
import * as PlayerService from "@/services/PlayerService";

import { LibraryProvider } from "@/providers/LibraryProvider";
import { LikesProvider } from "@/providers/LikesProvider";

import { useMusic } from "@/hooks/use-music";
import { useMusicApi } from "@/hooks/use-music-api";
import { PlaylistsProvider } from "@/providers/PlaylistsProvider";

const MyTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: "#0e0e0e",
    card: "#0e0e0e",
    border: "#111",
    text: "#fff",
  },
};

export default function Layout() {
  return (
    <AuthProvider>
      <CacheVersionsProvider>
        <ThemeProvider value={MyTheme}>
          <Gate />
        </ThemeProvider>
      </CacheVersionsProvider>
    </AuthProvider>
  );
}

function Gate() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return <View style={{ flex: 1, backgroundColor: "#0e0e0e" }} />;
  }
  if (!isAuthenticated) return <AuthContainer />;
  return <AuthedApp />;
}

function AuthedApp() {
  return (
    <LikesProvider>
      <LibraryProvider>
        <PlaylistsProvider>
          <MusicProvider>
            <InnerLayout />
          </MusicProvider>
        </PlaylistsProvider>
      </LibraryProvider>
    </LikesProvider>
  );
}

function InnerLayout() {
  const [isPlaying, setIsPlaying] = useState(false);

  const { currentSong, queue, queueIndex, next, prev } = useMusic();
  const { prefetchSongs } = useMusicApi();

  const nextRef = useRef(next);
  const prevRef = useRef(prev);
  useEffect(() => { nextRef.current = next; }, [next]);
  useEffect(() => { prevRef.current = prev; }, [prev]);

  useEffect(() => {
    if (!queue?.length) return;
    const nextSongs = queue.slice(queueIndex + 1, queueIndex + 4);
    const ids = nextSongs.map((s) => s.id).filter(Boolean);
    if (ids.length) prefetchSongs(ids);
  }, [queueIndex, queue, prefetchSongs]);

  useEffect(() => {
    const sub = PlayerService.onPlaybackState((state) => {
      if (state === PlayerService.State.Playing) {
        setIsPlaying(true);
      } else if (state === PlayerService.State.Paused || state === PlayerService.State.Stopped) {
        setIsPlaying(false);
      }
    });
    return () => sub.remove();
  }, []);

  const togglePlay = useCallback(async () => {
    if (!currentSong || queue.length === 0) return;
    const playing = await PlayerService.togglePlayPause();
    setIsPlaying(playing);
  }, [currentSong, queue]);

  const handleNext = useCallback(() => nextRef.current?.(), []);
  const handlePrev = useCallback(() => prevRef.current?.(), []);

  return (
    <View style={{ flex: 1 }}>
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { backgroundColor: "#0e0e0e" }]}
      />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#0e0e0e" },
          animation: "fade",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      {currentSong && (
        <MusicPlayer
          isPlaying={isPlaying}
          onTogglePlay={togglePlay}
          onNext={handleNext}
          onPrev={handlePrev}
        />
      )}
    </View>
  );
}