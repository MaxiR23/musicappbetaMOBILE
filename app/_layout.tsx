import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import TrackPlayer, { Event, State as TPState } from "react-native-track-player";

import AuthContainer from "@/components/features/auth/AuthContainer";
import { useAuth } from "@/hooks/use-auth";
import AuthProvider from "@/providers/AuthProvider";
import CacheVersionsProvider from "@/providers/CacheVersionsProvider";

import MusicPlayer from "@/components/features/player/MusicPlayer";
import { MusicProvider } from "@/providers/MusicProvider";
import { ensureTrackPlayer } from "@/services/setupTrackPlayer";

import { useMusic } from "@/hooks/use-music";
import { useMusicApi } from "@/hooks/use-music-api";

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
  useEffect(() => {
    ensureTrackPlayer().catch((e) => console.warn("TrackPlayer setup error", e));
  }, []);

  return (
    <MusicProvider>
      <InnerLayout />
    </MusicProvider>
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
    const sub = TrackPlayer.addEventListener(Event.PlaybackState, (e) => {
      if (e.state === TPState.Playing) {
        setIsPlaying(true);
      } else if (e.state === TPState.Paused || e.state === TPState.Stopped) {
        setIsPlaying(false);
      }
    });
    return () => sub.remove();
  }, []);

  const togglePlay = useCallback(async () => {
    await ensureTrackPlayer();
    if (!currentSong || queue.length === 0) return;
    const s = await TrackPlayer.getState().catch(() => null);
    if (s === TPState.Playing) {
      await TrackPlayer.pause().catch(() => { });
      setIsPlaying(false);
    } else {
      await TrackPlayer.play().catch(() => { });
      setIsPlaying(true);
    }
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