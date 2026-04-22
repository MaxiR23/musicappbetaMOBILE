import {
  LyricSyncStore,
  useIsActiveLine,
  useLyricSyncEngine,
  useLyricSyncStore,
} from "@/hooks/use-active-lyric-index";
import type { LyricLine } from "@/hooks/use-track-lyrics";
import React, { memo, useCallback, useEffect, useRef } from "react";
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
import { sharedTabStyles } from "./shared-tab-styles";

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

const TimedLyrics = memo(function TimedLyrics({ lines }: { lines: LyricLine[] }) {
  const { height } = useWindowDimensions();
  const store = useLyricSyncStore();
  useLyricSyncEngine(store, lines);

  const lineHeight = height < 700 ? 48 : 56;
  const paddingBottom = height * 0.32;
  const paddingTop = height * 0.08;

  const listRef = useRef<FlatList<LyricLine>>(null);
  const lastScrolledIndexRef = useRef<number>(-1);
  const lastSeekVersionRef = useRef<number>(0);
  const userTookControlRef = useRef<boolean>(false);

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      if (userTookControlRef.current) return;

      const newIndex = store.getIndex();
      if (newIndex < 0) return;
      if (newIndex === lastScrolledIndexRef.current) return;

      const currentSeekVersion = store.getSeekVersion();
      const wasSeek = currentSeekVersion !== lastSeekVersionRef.current;
      lastSeekVersionRef.current = currentSeekVersion;
      lastScrolledIndexRef.current = newIndex;

      listRef.current?.scrollToIndex({
        index: newIndex,
        animated: !wasSeek,
        viewPosition: SCROLL_VIEW_POSITION,
      });
    });
    return unsubscribe;
  }, [store]);

  useEffect(() => {
    lastScrolledIndexRef.current = -1;
    lastSeekVersionRef.current = 0;
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
        index={index}
        text={item.text}
        store={store}
        lineHeight={lineHeight}
        height={height}
      />
    ),
    [store, lineHeight, height]
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

interface LyricsLineItemProps {
  index: number;
  text: string;
  store: LyricSyncStore;
  lineHeight: number;
  height: number;
}

const LyricsLineItem = memo(
  function LyricsLineItem({
    index,
    text,
    store,
    lineHeight,
    height,
  }: LyricsLineItemProps) {
    const isActive = useIsActiveLine(store, index);

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
    prev.index === next.index &&
    prev.store === next.store &&
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