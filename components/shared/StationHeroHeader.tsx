import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft } from "lucide-react-native";
import React, { useMemo } from "react";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HERO_HEIGHT = SCREEN_WIDTH;

interface StationHeroHeaderProps {
  coverImage?: string | number;
  dominantColor?: string;
  title: string;
  heroTitle: string;
  heroSubtitle?: string;
  sections: any[];
  renderSection: (section: any, index: number) => React.ReactElement | null;
  onBackPress?: () => void;
  contentContainerStyle?: any;
  ListFooterComponent?: React.ReactElement | null;
  onEndReached?: () => void;
}

export default function StationHeroHeader({
  coverImage,
  dominantColor,
  title,
  heroTitle,
  heroSubtitle,
  sections,
  renderSection,
  onBackPress,
  contentContainerStyle,
  ListFooterComponent,
  onEndReached,
}: StationHeroHeaderProps) {
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const heroImageStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollY.value,
      [-200, 0],
      [1.5, 1],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ scale }],
    };
  });

  const collapsedHeaderStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [HERO_HEIGHT - 80, HERO_HEIGHT - 20],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const fixedBackButtonStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [HERO_HEIGHT - 120, HERO_HEIGHT - 60],
      [1, 0],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const listHeader = useMemo(
    () => (
      <View>
        <Animated.View style={[styles.heroImageWrapper, heroImageStyle]}>
          {coverImage ? (
            <Image
              source={coverImage}
              style={styles.heroImage}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.heroImage, { backgroundColor: "#222" }]} />
          )}
          <LinearGradient
            colors={[
              "transparent",
              "rgba(14,14,14,0.2)",
              "rgba(14,14,14,0.55)",
              "rgba(14,14,14,0.85)",
              "#0e0e0e",
            ]}
            locations={[0.4, 0.65, 0.8, 0.93, 1]}
            style={styles.heroGradient}
            pointerEvents="none"
          />
        </Animated.View>

        <View style={styles.heroInfo}>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {heroTitle}
          </Text>
          {heroSubtitle ? (
            <Text style={styles.heroSubtitle} numberOfLines={1}>
              {heroSubtitle}
            </Text>
          ) : null}
        </View>
      </View>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [coverImage, heroTitle, heroSubtitle]
  );

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.collapsedHeader,
          collapsedHeaderStyle,
          { backgroundColor: dominantColor || "#0e0e0e" },
        ]}
      >
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          <View style={styles.collapsedContent}>
            <Pressable onPress={onBackPress} style={styles.backButton}>
              <ChevronLeft size={28} color="#fff" strokeWidth={2.5} />
            </Pressable>
            <Text style={styles.collapsedTitle} numberOfLines={1}>
              {title}
            </Text>
          </View>
        </SafeAreaView>
      </Animated.View>

      <Animated.FlatList
        data={sections}
        renderItem={({ item, index }) => (
          <View style={styles.itemWrapper}>{renderSection(item, index)}</View>
        )}
        keyExtractor={(item, index) => {
          if (item.type === "track" && item.data?.id) return `track-${item.data.id}`;
          return `section-${item.type}-${index}`;
        }}
        onScroll={scrollHandler}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.6}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={listHeader}
        ListFooterComponent={ListFooterComponent}
        style={styles.list}
        contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
        removeClippedSubviews={true}
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={2}
        scrollsToTop={false}
        bounces={true}
        decelerationRate="normal"
        disableIntervalMomentum={true}
        overScrollMode="never"
      />

      <SafeAreaView
        edges={["top"]}
        style={styles.backButtonFixedContainer}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[styles.backButtonFixed, fixedBackButtonStyle]}
          pointerEvents="box-none"
        >
          <Pressable onPress={onBackPress}>
            <View style={styles.backButtonCircle}>
              <ChevronLeft size={28} color="#fff" strokeWidth={2.5} />
            </View>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0e0e0e" },
  list: { backgroundColor: "#0e0e0e" },
  contentContainer: { backgroundColor: "#0e0e0e" },
  itemWrapper: { backgroundColor: "#0e0e0e" },
  heroImageWrapper: {
    width: "100%",
    height: HERO_HEIGHT,
    overflow: "hidden",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroInfo: {
    alignItems: "flex-start",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: "#0e0e0e",
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    textAlign: "left",
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 13,
    color: "#a0a0a0",
    textAlign: "left",
  },
  collapsedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: "hidden",
  },
  collapsedContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  collapsedTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginLeft: 12,
    flex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonFixedContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  backButtonFixed: { paddingLeft: 16 },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
});