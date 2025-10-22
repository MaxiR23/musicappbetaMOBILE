import { Ionicons } from "@expo/vector-icons";
import React, { useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

interface LyricsSectionProps {
  lyricsOpen: boolean;
  lyricsText: string | null;
  lyricsLoading: boolean;
  lyricsError: string | null;
  trackTitle: string;
  artistName: string;
  onToggleLyrics: () => void;
  onScrollBeginDrag: () => void;
  onScrollEnd: () => void;
}

/**
 * Sección completa de letras al estilo Spotify
 * Incluye toggle button animado y card expandible con scroll
 */
export function LyricsSection({
  lyricsOpen,
  lyricsText,
  lyricsLoading,
  lyricsError,
  trackTitle,
  artistName,
  onToggleLyrics,
  onScrollBeginDrag,
  onScrollEnd,
}: LyricsSectionProps) {
  const lyricsBtnScale = useRef(new Animated.Value(1)).current;
  const { height } = useWindowDimensions();

  const dynamicMarginTop = height < 700 ? 24 : height < 800 ? 48 : 90; 

  return (
    <View style={[styles.lyricsSection, { marginTop: dynamicMarginTop }]}>
      {/* Toggle Button */}
      <Pressable
        onPressIn={() =>
          Animated.spring(lyricsBtnScale, {
            toValue: 0.97,
            useNativeDriver: true,
          }).start()
        }
        onPressOut={() =>
          Animated.spring(lyricsBtnScale, {
            toValue: 1,
            useNativeDriver: true,
          }).start()
        }
        onPress={onToggleLyrics}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Animated.View
          style={[
            styles.lyricsTogglePill,
            { transform: [{ scale: lyricsBtnScale }] },
          ]}
        >
          <Ionicons name="document-text-outline" size={18} color="#fff" />
          <Text style={styles.lyricsToggleText}>
            {lyricsOpen ? "Hide Lyrics" : "Show Lyrics"}
          </Text>
          <Ionicons
            name={lyricsOpen ? "chevron-up" : "chevron-down"}
            size={16}
            color="#fff"
          />
        </Animated.View>
      </Pressable>

      {/* Lyrics Card */}
      {lyricsOpen && (
        <View style={styles.lyricsCard}>
          {/* Header */}
          <View style={{ alignItems: "center", marginBottom: 8 }}>
            <Text style={styles.lyricsHeader}>Lyrics</Text>
            <Text style={styles.lyricsTrack} numberOfLines={1}>
              {trackTitle}
            </Text>
            <Text style={styles.lyricsArtist} numberOfLines={1}>
              {artistName}
            </Text>
          </View>

          {/* Scrollable Content */}
          <ScrollView
            nestedScrollEnabled
            showsVerticalScrollIndicator
            style={{ maxHeight: 320 }}
            contentContainerStyle={{ paddingBottom: 8 }}
            onScrollBeginDrag={onScrollBeginDrag}
            onMomentumScrollEnd={onScrollEnd}
            onScrollEndDrag={onScrollEnd}
            scrollEventThrottle={16}
          >
            {lyricsLoading && (
              <View style={styles.lyricsLoadingRow}>
                <ActivityIndicator size="small" />
                <Text style={styles.lyricsLoadingText}>Cargando letras…</Text>
              </View>
            )}

            {!lyricsLoading && lyricsError && (
              <Text style={styles.lyricsError}>{lyricsError}</Text>
            )}

            {!lyricsLoading && !lyricsError && !!lyricsText && (
              <Text style={styles.lyricsText}>{lyricsText}</Text>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  lyricsSection: {
    marginBottom: 26,
  },
  lyricsTogglePill: {
    alignSelf: "center",
    width: "92%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    shadowColor: "transparent",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
    overflow: "visible",
  },
  lyricsToggleText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
    flex: 1,
  },
  lyricsCard: {
    marginTop: 14,
    borderRadius: 16,
    padding: 14,
    backgroundColor: "rgba(20,20,20,0.9)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  lyricsHeader: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  lyricsTrack: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  lyricsArtist: {
    color: "#bbb",
    fontSize: 13,
    marginBottom: 6,
  },
  lyricsText: {
    color: "#fff",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    letterSpacing: 0.2,
  },
  lyricsLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  lyricsLoadingText: {
    color: "#ccc",
    marginLeft: 8,
  },
  lyricsError: {
    color: "#f66",
    textAlign: "center",
    paddingVertical: 18,
  },
});