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
  
  // Si tiene menos de 4 imágenes, rellenar con la primera o placeholder
  while (displayImages.length < 4) {
    displayImages.push(displayImages[0] || "");
  }

  return (
    <View style={{ width: "100%", height: "100%", flexDirection: "row", flexWrap: "wrap" }}>
      {displayImages.map((img, idx) => {
        // Determinar qué esquinas tienen border radius
        const borderRadiusStyles: any = {};
        if (idx === 0) borderRadiusStyles.borderTopLeftRadius = 8; // Top-left
        if (idx === 1) borderRadiusStyles.borderTopRightRadius = 8; // Top-right
        if (idx === 2) borderRadiusStyles.borderBottomLeftRadius = 8; // Bottom-left
        if (idx === 3) borderRadiusStyles.borderBottomRightRadius = 8; // Bottom-right

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

interface AnimatedHeaderTestProps {
  /** URL del cover del álbum (cuadrado) - para álbumes */
  coverImage?: string;
  /** Array de URLs para mosaico - para playlists */
  mosaicImages?: string[];
  /** Título del álbum o playlist */
  title: string;
  /** Contenido scrolleable */
  children: React.ReactNode;
  /** Callback al presionar el botón back */
  onBackPress?: () => void;
  /** Callback al presionar el botón de menú (opcional) */
  onMenuPress?: () => void;
  /** Estilos adicionales para el contenedor */
  contentContainerStyle?: any;
}

export default function AnimatedHeaderTest({
  coverImage,
  mosaicImages,
  title,
  children,
  onBackPress,
  onMenuPress,
  contentContainerStyle,
}: AnimatedHeaderTestProps) {
  const scrollY = useSharedValue(0);

  // Determinar si es mosaico o cover único
  const isMosaic = !coverImage && mosaicImages && mosaicImages.length > 0;

  // Handler de scroll
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Animación del cover cuadrado (se encoge y desaparece en el centro)
  const coverAnimatedStyle = useAnimatedStyle(() => {
    // Tamaño inicial: 240, se encoge progresivamente
    const size = interpolate(
      scrollY.value,
      [0, 200],
      [240, 100], // Se encoge hasta 100px
      Extrapolation.CLAMP
    );

    // Desaparece gradualmente
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

  // Animación del header colapsado (aparece arriba)
  const collapsedHeaderStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [220, 260], // Aparece DESPUÉS de que el título original haya scrolleado fuera
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
      [200, 240], // Desaparece cuando el top bar empieza a aparecer
      [1, 0],
      Extrapolation.CLAMP
    );

    return {
      opacity,
    };
  });

  // Animación del botón de menú fijo (igual que el back button)
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

      {/* ScrollView con contenido */}
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        {/* Espacio inicial para el cover */}
        <View style={styles.heroSpace}>
          {/* Cover animado (flotante) */}
          <Animated.View style={[styles.coverContainer, coverAnimatedStyle]}>
            {isMosaic && mosaicImages ? (
              // Renderizar mosaico para playlist
              <MosaicCover images={mosaicImages} />
            ) : (
              // Renderizar cover único para álbum
              <Image 
                source={{ uri: coverImage }} 
                style={styles.coverImage}
                resizeMode="cover"
              />
            )}
          </Animated.View>
        </View>

        {/* Contenido scrolleable */}
        <View style={[styles.content, contentContainerStyle]}>{children}</View>
      </Animated.ScrollView>

      {/* Back button fijo (arriba a la izquierda) */}
      <SafeAreaView edges={["top"]} style={styles.backButtonFixedContainer} pointerEvents="box-none">
        <Animated.View style={[styles.backButtonFixed, fixedBackButtonStyle]} pointerEvents="box-none">
          <Pressable onPress={onBackPress}>
            <View style={styles.backButtonCircle}>
              <ChevronLeft size={28} color="#fff" strokeWidth={2.5} />
            </View>
          </Pressable>
        </Animated.View>
      </SafeAreaView>

      {/* Menu button fijo (arriba a la derecha) */}
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
  content: {
    backgroundColor: "#0e0e0e",
  },
});