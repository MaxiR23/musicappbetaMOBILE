import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface AnimatedHeaderProps {
  /** URL de la imagen de fondo */
  backgroundImage: string;
  /** Título principal (nombre del artista, álbum, playlist) */
  title: string;
  /** Subtítulo opcional (ej: "16.3M monthly listeners", "2024 • 12 songs") */
  subtitle?: string;
  /** Contenido scrolleable */
  children: React.ReactNode;
  /** Altura del header expandido (default: 400) */
  headerHeight?: number;
  /** Altura del header colapsado (default: 100) */
  collapsedHeight?: number;
  /** Callback al presionar el botón back */
  onBackPress?: () => void;
  /** Estilos adicionales para el contenedor */
  contentContainerStyle?: any;
}

export default function AnimatedArtistHeader({
  backgroundImage,
  title,
  subtitle,
  children,
  headerHeight = 400,
  collapsedHeight = 100,
  onBackPress,
  contentContainerStyle,
}: AnimatedHeaderProps) {
  const scrollY = useSharedValue(0);
  const insets = useSafeAreaInsets();

  // Handler de scroll
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Animación del header background
  const headerAnimatedStyle = useAnimatedStyle(() => {
    const height = interpolate(
      scrollY.value,
      [0, headerHeight - collapsedHeight],
      [headerHeight, collapsedHeight],
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      scrollY.value,
      [0, headerHeight - collapsedHeight - 50, headerHeight - collapsedHeight],
      [1, 1, 0],
      Extrapolation.CLAMP
    );

    return {
      height,
      opacity,
    };
  });

  // Animación del título grande (abajo)
  const largeTitleStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, 100, 150],
      [1, 0.5, 0],
      Extrapolation.CLAMP
    );

    const translateY = interpolate(
      scrollY.value,
      [0, headerHeight - collapsedHeight],
      [0, -30],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  // Animación del blur y título pequeño (arriba - collapsed)
  const collapsedHeaderStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [100, 180], // Empieza a aparecer cuando el botón fijo empieza a desaparecer
      [0, 1],
      Extrapolation.CLAMP
    );

    return {
      opacity,
    };
  });

  // Animación del botón back fijo (desaparece cuando aparece el collapsed)
  const fixedBackButtonStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [100, 150], // Desaparece ANTES, justo cuando llega a la altura del top bar
      [1, 0],
      Extrapolation.CLAMP
    );

    return {
      opacity,
    };
  });

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
          </View>
        </SafeAreaView>
      </Animated.View>

      {/* ScrollView con contenido */}
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        {/* Header con imagen de fondo */}
        <Animated.View style={[styles.headerContainer, headerAnimatedStyle]}>
          <Image 
            source={{ uri: backgroundImage }} 
            style={styles.backgroundImage}
            resizeMode="cover"
          />

          {/* Gradient overlay */}
          <LinearGradient
            colors={["transparent", "rgba(14, 14, 14, 0.8)", "#0e0e0e"]}
            style={styles.gradient}
            locations={[0, 0.7, 1]}
          />

          {/* Título grande (abajo) */}
          <Animated.View style={[styles.heroInfo, largeTitleStyle]}>
            <Text style={styles.artistName}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </Animated.View>
        </Animated.View>

        {/* Contenido scrolleable con padding */}
        <View style={[styles.content, contentContainerStyle]}>{children}</View>
      </Animated.ScrollView>

      {/* Back button FIJO (siempre visible, fuera del scroll) */}
      <Animated.View style={[styles.backButtonFixed, { top: insets.top + 16 }, fixedBackButtonStyle]}>
        <Pressable onPress={onBackPress}>
          <View style={styles.backButtonCircle}>
            <ChevronLeft size={28} color="#fff" strokeWidth={2.5} />
          </View>
        </Pressable>
      </Animated.View>
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
    height: 100,
    zIndex: 10,
    overflow: "hidden",
  },
  collapsedContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  collapsedTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginLeft: 12,
    flex: 1,
  },

  // Header expandido
  headerContainer: {
    width: SCREEN_WIDTH,
    overflow: "hidden",
    alignSelf: "center",
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },

  // Back button fijo
  backButtonFixed: {
    position: "absolute",
    left: 16,
    zIndex: 5,
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  // Título grande (hero)
  heroInfo: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
  },
  artistName: {
    fontSize: 42,
    fontWeight: "900",
    color: "#fff",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#ccc",
    fontWeight: "500",
  },

  // Contenido
  content: {
    backgroundColor: "#0e0e0e",
    paddingTop: 20,
  },
});