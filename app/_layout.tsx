import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import TrackPlayer, { State as TPState } from "react-native-track-player";

import AuthContainer from "@/src/components/features/auth/AuthContainer";
import { useAuth } from "@/src/hooks/use-auth";
import AuthProvider from "@/src/providers/AuthProvider";
import CacheVersionsProvider from "@/src/providers/CacheVersionsProvider";

import MusicPlayer from "@/src/components/features/player/MusicPlayer";
import { MusicProvider } from "../src/providers/MusicProvider";
import { ensureTrackPlayer } from "../src/services/setupTrackPlayer";

import { useMusic } from "@/src/hooks/use-music";
import { useMusicApi } from "@/src/hooks/use-music-api";

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
  // setup del player solo cuando el usuario está autenticado
  useEffect(() => {
    ensureTrackPlayer().catch((e) =>
      console.warn("TrackPlayer setup error", e)
    );
  }, []);

  return (
    <MusicProvider>
      <InnerLayout />
    </MusicProvider>
  );
}

function InnerLayout() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const { currentSong, queue, queueIndex, next, prev } = useMusic();
  const { prefetchSongs } = useMusicApi();

  const nextRef = useRef(next);
  const prevRef = useRef(prev);
  useEffect(() => {
    nextRef.current = next;
  }, [next]);
  useEffect(() => {
    prevRef.current = prev;
  }, [prev]);

  // Prefetch próximos 3
  useEffect(() => {
    if (!queue?.length) return;
    const nextSongs = queue.slice(queueIndex + 1, queueIndex + 4);
    const ids = nextSongs.map((s) => s.id).filter(Boolean);
    if (ids.length) prefetchSongs(ids);
  }, [queueIndex, queue, prefetchSongs]);

  // Poll de progreso/estado
  useEffect(() => {
    let mounted = true;
    const id = setInterval(async () => {
      try {
        const [prog, state] = await Promise.all([
          TrackPlayer.getProgress(),
          TrackPlayer.getState(),
        ]);
        if (!mounted) return;

        setIsPlaying(state === TPState.Playing);
        const dMs = (prog?.duration ?? 0) * 1000;
        const pMs = (prog?.position ?? 0) * 1000;
        setDuration(dMs);
        setCurrentTime(pMs);
        setProgress(dMs > 0 ? pMs / dMs : 0);
      } catch { }
    }, 500);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  // NO re-hidratamos la cola acá. La única fuente de verdad es MusicProvider.playFromList()

  const togglePlay = async () => {
    await ensureTrackPlayer();
    // si no hay canción/cola, no intentes reproducir
    if (!currentSong || queue.length === 0) return;

    const s = await TrackPlayer.getState().catch(() => null);
    if (s === TPState.Playing) {
      await TrackPlayer.pause().catch(() => { });
      setIsPlaying(false);
    } else {
      await TrackPlayer.play().catch(() => { });
      setIsPlaying(true);
    }
  };

  const seekTo = async (val01: number) => {
    if (!duration) return;
    const seconds = (val01 * duration) / 1000;
    await TrackPlayer.seekTo(seconds).catch(() => { });
  };

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
          progress={progress}
          duration={duration}
          currentTime={currentTime}
          onTogglePlay={togglePlay}
          onSeek={seekTo}
          onNext={() => nextRef.current?.()}
          onPrev={() => prevRef.current?.()}
        />
      )}
    </View>
  );
}