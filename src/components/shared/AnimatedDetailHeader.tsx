// src/components/shared/AnimatedDetailHeader.tsx
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { ChevronLeft } from "lucide-react-native";
import React from "react";
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Componente para renderizar mosaico de playlist
function MosaicCover({ images }: { images: string[] }) {
  const displayImages = images.slice(0, 4);

  while (displayImages.length < 4) {
    displayImages.push(displayImages[0] || "");
  }

  return (
    <View style={{ width: "100%", height: "100%", flexDirection: "row", flexWrap: "wrap" }}>
      {displayImages.map((img, idx) => {
        const borderRadiusStyles: any = {};
        if (idx === 0) borderRadiusStyles.borderTopLeftRadius = 8;
        if (idx === 1) borderRadiusStyles.borderTopRightRadius = 8;
        if (idx === 2) borderRadiusStyles.borderBottomLeftRadius = 8;
        if (idx === 3) borderRadiusStyles.borderBottomRightRadius = 8;

        return (
          <Image
            key={idx}
            source={{ uri: img }}
            style={{
              width: "50%",
              height: "50%",
              backgroundColor: "#2a2a2a",
              ...borderRadiusStyles,
            }}
            resizeMode="cover"
          />
        );
      })}
    </View>
  );
}

interface AnimatedDetailHeaderProps {
  /** URL del cover del álbum (cuadrado) - para álbumes */
  coverImage?: string;
  /** Array de URLs para mosaico - para playlists */
  mosaicImages?: string[];
  /** Título del álbum o playlist */
  title: string;
  /** Array de secciones a renderizar */
  sections: any[];
  /** Función para renderizar cada sección */
  renderSection: (section: any, index: number) => React.ReactElement | null;
  /** Callback al presionar el botón back */
  onBackPress?: () => void;
  /** Callback al presionar el botón de menú (opcional) */
  onMenuPress?: () => void;
  /** Estilos adicionales para el contentContainerStyle */
  contentContainerStyle?: any;
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
}: AnimatedDetailHeaderProps) {
  const scrollY = useSharedValue(0);

  const isMosaic = !coverImage && mosaicImages && mosaicImages.length > 0;

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Animación del cover cuadrado
  const coverAnimatedStyle = useAnimatedStyle(() => {
    const size = interpolate(
      scrollY.value,
      [0, 200],
      [240, 100],
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      scrollY.value,
      [150, 220],
      [1, 0],
      Extrapolation.CLAMP
    );

    return {
      width: size,
      height: size,
      opacity,
    };
  });

  // Animación del header colapsado
  const collapsedHeaderStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [220, 260],
      [0, 1],
      Extrapolation.CLAMP
    );

    return {
      opacity,
    };
  });

  // Animación del botón back fijo
  const fixedBackButtonStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [200, 240],
      [1, 0],
      Extrapolation.CLAMP
    );

    return {
      opacity,
    };
  });

  // Animación del botón de menú fijo
  const fixedMenuButtonStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [200, 240],
      [1, 0],
      Extrapolation.CLAMP
    );

    return {
      opacity,
    };
  });

  // Header del FlatList (cover animado)
  const ListHeader = () => (
    <View style={styles.heroSpace}>
      <Animated.View style={[styles.coverContainer, coverAnimatedStyle]}>
        {isMosaic && mosaicImages ? (
          <MosaicCover images={mosaicImages} />
        ) : (
          <Image
            source={{ uri: coverImage }}
            style={styles.coverImage}
            resizeMode="cover"
          />
        )}
      </Animated.View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header colapsado (sticky) */}
      <Animated.View style={[styles.collapsedHeader, collapsedHeaderStyle]}>
        <BlurView intensity={80} style={StyleSheet.absoluteFillObject} tint="dark" />
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          <View style={styles.collapsedContent}>
            <Pressable onPress={onBackPress} style={styles.backButton}>
              <ChevronLeft size={28} color="#fff" strokeWidth={2.5} />
            </Pressable>
            <Text style={styles.collapsedTitle} numberOfLines={1}>
              {title}
            </Text>
            {onMenuPress && (
              <Pressable onPress={onMenuPress} style={styles.menuButton}>
                <Ionicons name="ellipsis-vertical" size={18} color="#fff" />
              </Pressable>
            )}
          </View>
        </SafeAreaView>
      </Animated.View>

      {/* FlatList con contenido virtualizado */}
      <Animated.FlatList
        data={sections}
        renderItem={({ item, index }) => renderSection(item, index)}
        keyExtractor={(item, index) => {
          // Si es track, usar su ID único
          if (item.type === 'track' && item.data?.id) {
            return `track-${item.data.id}`;
          }
          // Para otros tipos usar type + index
          return `section-${item.type}-${index}`;
        }}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={ListHeader}
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

      {/* Back button fijo */}
      <SafeAreaView edges={["top"]} style={styles.backButtonFixedContainer} pointerEvents="box-none">
        <Animated.View style={[styles.backButtonFixed, fixedBackButtonStyle]} pointerEvents="box-none">
          <Pressable onPress={onBackPress}>
            <View style={styles.backButtonCircle}>
              <ChevronLeft size={28} color="#fff" strokeWidth={2.5} />
            </View>
          </Pressable>
        </Animated.View>
      </SafeAreaView>

      {/* Menu button fijo */}
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
  container: {
    flex: 1,
    backgroundColor: "#0e0e0e",
  },

  // Header colapsado (sticky top)
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
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  // Back button fijo
  backButtonFixedContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  backButtonFixed: {
    paddingLeft: 16,
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Menu button fijo
  menuButtonFixedContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  menuButtonFixed: {
    paddingRight: 16,
  },
  menuButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Espacio del hero
  heroSpace: {
    height: 260,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0e0e0e",
    paddingTop: 60,
    marginTop: 40,
    marginBottom: 20,
  },

  // Cover animado
  coverContainer: {
    borderRadius: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  coverImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },

  // Contenido
  contentContainer: {
    backgroundColor: "#0e0e0e",
  },
});