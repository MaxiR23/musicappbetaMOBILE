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
const MAX_FONT_SCALE = 1.3;
const MIN_FONT_SCALE = 0.7;

interface LyricsTabProps {
  lyricsText: string | null;
  lyricsLines: LyricLine[] | null;
  lyricsLoading: boolean;
  lyricsError: string | null;
}

function computeFontSize(width: number, height: number): number {
  let size: number;
  if (height < 700) size = 17;
  else if (height > 844) size = 22;
  else size = 20;

  if (width < 380) size -= 3;
  else if (width < 410) size -= 2;

  return size;
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
        <Text style={styles.plainText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {lyricsText}
        </Text>
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
  const { width, height } = useWindowDimensions();
  const store = useLyricSyncStore();
  useLyricSyncEngine(store, lines);

  const fontSize = computeFontSize(width, height);
  const lineHeight = Math.max(48, fontSize * 2.5);
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
        fontSize={fontSize}
      />
    ),
    [store, lineHeight, fontSize]
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
  fontSize: number;
}

const LyricsLineItem = memo(
  function LyricsLineItem({
    index,
    text,
    store,
    lineHeight,
    fontSize,
  }: LyricsLineItemProps) {
    const isActive = useIsActiveLine(store, index);

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
      <View style={[styles.lineRow, { height: lineHeight }]}>
        <Animated.Text
          style={[
            styles.lineText,
            {
              fontSize,
              lineHeight: fontSize * 1.2,
              opacity,
              transform: [{ scale }],
            },
          ]}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={MIN_FONT_SCALE}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
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
    prev.fontSize === next.fontSize
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
});