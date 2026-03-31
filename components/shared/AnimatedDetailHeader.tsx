import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { ChevronLeft } from "lucide-react-native";
import React from "react";
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

function MosaicCover({ images }: { images: string[] }) {
  const displayImages = images.slice(0, 4);
  while (displayImages.length < 4) {
    displayImages.push(displayImages[0] ?? "");
  }

  return (
    <View style={{ width: "100%", height: "100%", flexDirection: "row", flexWrap: "wrap" }}>
      {displayImages.map((img, idx) => {
        const borderRadiusStyles: any = {};
        if (idx === 0) borderRadiusStyles.borderTopLeftRadius = 8;
        if (idx === 1) borderRadiusStyles.borderTopRightRadius = 8;
        if (idx === 2) borderRadiusStyles.borderBottomLeftRadius = 8;
        if (idx === 3) borderRadiusStyles.borderBottomRightRadius = 8;

        const cellStyle = {
          width: "50%" as const,
          height: "50%" as const,
          backgroundColor: "#2a2a2a",
          ...borderRadiusStyles,
        };

        if (!img) {
          return <View key={idx} style={cellStyle} />;
        }

        return (
          <Image
            key={idx}
            source={img}
            style={cellStyle}
            resizeMode="cover"
          />
        );
      })}
    </View>
  );
}

interface AnimatedDetailHeaderProps {
  coverImage?: string;
  mosaicImages?: string[];
  title: string;
  sections: any[];
  renderSection: (section: any, index: number) => React.ReactElement | null;
  onBackPress?: () => void;
  onMenuPress?: () => void;
  contentContainerStyle?: any;
  ListFooterComponent?: React.ReactElement | null;
  onEndReached?: () => void;
}

export default function AnimatedDetailHeader({
  coverImage,
  mosaicImages,
  title,
  sections,
  renderSection,
  onBackPress,
  onMenuPress,
  contentContainerStyle,
  ListFooterComponent,
  onEndReached,
}: AnimatedDetailHeaderProps) {
  const scrollY = useSharedValue(0);
  const isMosaic = !coverImage && mosaicImages && mosaicImages.length > 0;

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const coverAnimatedStyle = useAnimatedStyle(() => {
    const size = interpolate(scrollY.value, [0, 200], [240, 100], Extrapolation.CLAMP);
    const opacity = interpolate(scrollY.value, [150, 220], [1, 0], Extrapolation.CLAMP);
    return { width: size, height: size, opacity };
  });

  const collapsedHeaderStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [250, 290], [0, 1], Extrapolation.CLAMP);
    return { opacity };
  });

  const fixedBackButtonStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [200, 240], [1, 0], Extrapolation.CLAMP);
    return { opacity };
  });

  const fixedMenuButtonStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [230, 270], [1, 0], Extrapolation.CLAMP);
    return { opacity };
  });

  const ListHeader = () => (
    <View style={styles.heroSpace}>
      <Animated.View style={[styles.coverContainer, coverAnimatedStyle]}>
        {isMosaic && mosaicImages ? (
          <MosaicCover images={mosaicImages} />
        ) : (
          <Image source={coverImage} style={styles.coverImage} contentFit="cover" />
        )}
      </Animated.View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.collapsedHeader, collapsedHeaderStyle]}>
        <BlurView intensity={80} style={StyleSheet.absoluteFillObject} tint="dark" />
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          <View style={styles.collapsedContent}>
            <Pressable onPress={onBackPress} style={styles.backButton}>
              <ChevronLeft size={28} color="#fff" strokeWidth={2.5} />
            </Pressable>
            <Text style={styles.collapsedTitle} numberOfLines={1}>{title}</Text>
            {onMenuPress && (
              <Pressable onPress={onMenuPress} style={styles.menuButton}>
                <Ionicons name="ellipsis-vertical" size={18} color="#fff" />
              </Pressable>
            )}
          </View>
        </SafeAreaView>
      </Animated.View>

      <Animated.FlatList
        data={sections}
        renderItem={({ item, index }) => renderSection(item, index)}
        keyExtractor={(item, index) => {
          if (item.type === "track" && item.data?.id) return `track-${item.data.id}`;
          return `section-${item.type}-${index}`;
        }}
        onScroll={scrollHandler}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.6}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooterComponent}
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

      <SafeAreaView edges={["top"]} style={styles.backButtonFixedContainer} pointerEvents="box-none">
        <Animated.View style={[styles.backButtonFixed, fixedBackButtonStyle]} pointerEvents="box-none">
          <Pressable onPress={onBackPress}>
            <View style={styles.backButtonCircle}>
              <ChevronLeft size={28} color="#fff" strokeWidth={2.5} />
            </View>
          </Pressable>
        </Animated.View>
      </SafeAreaView>

      {onMenuPress && (
        <SafeAreaView edges={["top"]} style={styles.menuButtonFixedContainer} pointerEvents="box-none">
          <Animated.View style={[styles.menuButtonFixed, fixedMenuButtonStyle]} pointerEvents="box-none">
            <Pressable onPress={onMenuPress}>
              <View style={styles.menuButtonCircle}>
                <Ionicons name="ellipsis-vertical" size={18} color="#fff" />
              </View>
            </Pressable>
          </Animated.View>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0e0e0e" },
  collapsedHeader: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, overflow: "hidden" },
  collapsedContent: { flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 8 },
  collapsedTitle: { fontSize: 18, fontWeight: "700", color: "#fff", marginLeft: 12, flex: 1 },
  backButton: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  menuButton: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  backButtonFixedContainer: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 5, flexDirection: "row", justifyContent: "flex-start" },
  backButtonFixed: { paddingLeft: 16 },
  backButtonCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0, 0, 0, 0.4)", justifyContent: "center", alignItems: "center" },
  menuButtonFixedContainer: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 5, flexDirection: "row", justifyContent: "flex-end" },
  menuButtonFixed: { paddingRight: 16 },
  menuButtonCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0, 0, 0, 0.4)", justifyContent: "center", alignItems: "center" },
  heroSpace: { height: 260, justifyContent: "center", alignItems: "center", backgroundColor: "#0e0e0e", paddingTop: 60, marginTop: 40, marginBottom: 20 },
  coverContainer: { borderRadius: 8, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
  coverImage: { width: "100%", height: "100%", borderRadius: 8 },
  contentContainer: { backgroundColor: "#0e0e0e" },
});