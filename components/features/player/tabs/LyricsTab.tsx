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
  useWindowDimensions,
  View,
} from "react-native";
import { useProgress } from "react-native-track-player";
import { sharedTabStyles } from "./shared-tab-styles";

const POLL_INTERVAL_MS = 500;
const SCROLL_VIEW_POSITION = 0.4;
const SCALE_ACTIVE = 1.06;
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
        <Text style={sharedTabStyles.errorText}>{t(`lyrics.${lyricsError}`)}</Text>
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
  const { height } = useWindowDimensions();
  const positionMs = position * 1000;

  const lineHeight = height < 700 ? 48 : 56;
  const paddingBottom = height * 0.32;
  const paddingTop = height * 0.08;

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
      length: lineHeight,
      offset: lineHeight * index,
      index,
    }),
    [lineHeight]
  );

  const renderItem: ListRenderItem<LyricLine> = useCallback(
    ({ item, index }) => (
      <LyricsLineItem
        text={item.text}
        isActive={index === activeIndex}
        lineHeight={lineHeight}
        height={height}
      />
    ),
    [activeIndex, lineHeight, height]
  );

  const handleScrollToIndexFailed = useCallback(
    (info: {
      index: number;
      highestMeasuredFrameIndex: number;
      averageItemLength: number;
    }) => {
      listRef.current?.scrollToOffset({
        offset: info.index * lineHeight,
        animated: true,
      });
    },
    [lineHeight]
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
      contentContainerStyle={[
        styles.timedContent,
        { paddingTop, paddingBottom },
      ]}
    />
  );
});

const LyricsLineItem = memo(
  function LyricsLineItem({
    text,
    isActive,
    lineHeight,
    height,
  }: {
    text: string;
    isActive: boolean;
    lineHeight: number;
    height: number;
  }) {
    const scale = useRef(new Animated.Value(isActive ? SCALE_ACTIVE : 1)).current;
    const opacity = useRef(new Animated.Value(isActive ? 1 : 0.4)).current;

    const fontSize = height < 700 ? 17 : height > 844 ? 22 : 20;

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
      <View style={[styles.lineRow, { height: lineHeight }]}>
        <Animated.Text
          style={[
            styles.lineText,
            { fontSize, lineHeight: fontSize * 1.2, opacity, transform: [{ scale }] },
          ]}
          numberOfLines={2}
        >
          {text}
        </Animated.Text>
      </View>
    );
  },
  (prev, next) =>
    prev.text === next.text &&
    prev.isActive === next.isActive &&
    prev.lineHeight === next.lineHeight &&
    prev.height === next.height
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
  },
  lineRow: {
    justifyContent: "center",
  },
  lineText: {
    color: "#fff",
    fontWeight: "700",
    textAlign: "center",
  },
  lineTextActive: {
    color: "#fff",
  },
});