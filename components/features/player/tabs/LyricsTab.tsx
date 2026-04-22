import type { LyricLine } from "@/hooks/use-track-lyrics";
import React, { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  ListRenderItem,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useProgress } from "react-native-track-player";
import { sharedTabStyles } from "./shared-tab-styles";

const LINE_HEIGHT = 56;
const POLL_INTERVAL_MS = 500;
const SCROLL_VIEW_POSITION = 0.4;
const SCALE_ACTIVE = 1.12;
const SCALE_ANIMATION_DURATION = 350;

interface LyricsTabProps {
  lyricsText: string | null;
  lyricsLines: LyricLine[] | null;
  lyricsLoading: boolean;
  lyricsError: string | null;
}

export const LyricsTab = memo(function LyricsTab({
  lyricsText,
  lyricsLines,
  lyricsLoading,
  lyricsError,
}: LyricsTabProps) {
  const { t } = useTranslation("player");

  if (lyricsLoading) {
    return (
      <View style={sharedTabStyles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={sharedTabStyles.loadingText}>{t("lyrics.loading")}</Text>
      </View>
    );
  }

  if (lyricsError) {
    return (
      <View style={sharedTabStyles.errorContainer}>
        <Text style={sharedTabStyles.errorText}>{lyricsError}</Text>
      </View>
    );
  }

  if (lyricsLines && lyricsLines.length > 0) {
    return <TimedLyrics lines={lyricsLines} />;
  }

  if (lyricsText) {
    return (
      <ScrollView
        style={styles.plainScroll}
        contentContainerStyle={styles.plainContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.plainText}>{lyricsText}</Text>
      </ScrollView>
    );
  }

  return (
    <View style={sharedTabStyles.errorContainer}>
      <Text style={sharedTabStyles.placeholderText}>{t("lyrics.noLyrics")}</Text>
    </View>
  );
});

function findActiveLineIndex(lines: LyricLine[], positionMs: number): number {
  if (lines.length === 0 || positionMs < lines[0].start_time) return -1;

  let lo = 0;
  let hi = lines.length - 1;

  while (lo < hi) {
    const mid = (lo + hi + 1) >>> 1;
    if (lines[mid].start_time <= positionMs) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

const TimedLyrics = memo(function TimedLyrics({ lines }: { lines: LyricLine[] }) {
  const { position } = useProgress(POLL_INTERVAL_MS);
  const positionMs = position * 1000;

  const activeIndex = useMemo(
    () => findActiveLineIndex(lines, positionMs),
    [lines, positionMs]
  );

  const listRef = useRef<FlatList<LyricLine>>(null);
  const lastScrolledIndexRef = useRef<number>(-1);
  const userTookControlRef = useRef<boolean>(false);

  useEffect(() => {
    if (userTookControlRef.current) return;
    if (activeIndex < 0) return;
    if (activeIndex === lastScrolledIndexRef.current) return;

    lastScrolledIndexRef.current = activeIndex;
    listRef.current?.scrollToIndex({
      index: activeIndex,
      animated: true,
      viewPosition: SCROLL_VIEW_POSITION,
    });
  }, [activeIndex]);

  useEffect(() => {
    lastScrolledIndexRef.current = -1;
    userTookControlRef.current = false;
  }, [lines]);

  const handleScrollBeginDrag = useCallback(() => {
    userTookControlRef.current = true;
  }, []);

  const keyExtractor = useCallback(
    (item: LyricLine, index: number) => `${item.id ?? index}`,
    []
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<LyricLine> | null | undefined, index: number) => ({
      length: LINE_HEIGHT,
      offset: LINE_HEIGHT * index,
      index,
    }),
    []
  );

  const renderItem: ListRenderItem<LyricLine> = useCallback(
    ({ item, index }) => (
      <LyricsLineItem text={item.text} isActive={index === activeIndex} />
    ),
    [activeIndex]
  );

  const handleScrollToIndexFailed = useCallback(
    (info: {
      index: number;
      highestMeasuredFrameIndex: number;
      averageItemLength: number;
    }) => {
      listRef.current?.scrollToOffset({
        offset: info.index * LINE_HEIGHT,
        animated: true,
      });
    },
    []
  );

  return (
    <FlatList
      ref={listRef}
      data={lines}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      getItemLayout={getItemLayout}
      onScrollToIndexFailed={handleScrollToIndexFailed}
      onScrollBeginDrag={handleScrollBeginDrag}
      showsVerticalScrollIndicator={false}
      initialNumToRender={12}
      maxToRenderPerBatch={8}
      windowSize={7}
      removeClippedSubviews
      contentContainerStyle={styles.timedContent}
    />
  );
});

const LyricsLineItem = memo(
  function LyricsLineItem({ text, isActive }: { text: string; isActive: boolean }) {
    const scale = useRef(new Animated.Value(isActive ? SCALE_ACTIVE : 1)).current;
    const opacity = useRef(new Animated.Value(isActive ? 1 : 0.4)).current;

    useEffect(() => {
      Animated.parallel([
        Animated.timing(scale, {
          toValue: isActive ? SCALE_ACTIVE : 1,
          duration: SCALE_ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: isActive ? 1 : 0.4,
          duration: SCALE_ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    }, [isActive]);

    return (
      <View style={styles.lineRow}>
        <Animated.Text
          style={[
            styles.lineText,
            {
              opacity,
              transform: [{ scale }],
            },
          ]}
          numberOfLines={2}
        >
          {text}
        </Animated.Text>
      </View>
    );
  },
  (prev, next) => prev.text === next.text && prev.isActive === next.isActive
);

const styles = StyleSheet.create({
  plainScroll: {
    flex: 1,
  },
  plainContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: "center",
  },
  plainText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 26,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  timedContent: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 260,
  },
  lineRow: {
    height: LINE_HEIGHT,
    justifyContent: "center",
  },
  lineText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 24,
    textAlign: "center",
  },
  lineTextActive: {
    color: "#fff",
  },
});