// src/components/HeroSection.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { ReactNode } from "react";
import {
  Image,
  ImageBackground,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import BackButton from "./BackButton";

interface HeroSectionProps {
  /**
   * URL de la imagen de fondo
   */
  backgroundImage?: string;

  /**
   * Altura del hero (default: 320)
   */
  height?: number;

  /**
   * Cantidad de blur en la imagen de fondo (default: 40)
   */
  blurRadius?: number;

  /**
   * Array de colores para el gradiente
   * Default: gradiente oscuro desde arriba
   */
  gradientColors?: string[];

  /**
   * Posiciones del gradiente (0-1)
   */
  gradientLocations?: number[];

  /**
   * Callback para el botón de "más opciones" (3 puntos)
   * Si se provee, se muestra el botón
   */
  onMorePress?: () => void;

  /**
   * Contenido personalizado que va en el centro/bottom del hero
   * Aquí va el cover, título, info, etc.
   */
  children: ReactNode;

  /**
   * Si true, usa Image en vez de ImageBackground
   * Útil para ArtistScreen que usa Image directo
   */
  useDirectImage?: boolean;

  /**
   * Alineación vertical del contenido
   * Default: 'flex-end' (abajo)
   */
  contentPosition?: "flex-start" | "center" | "flex-end";
}

/**
 * Componente reutilizable para la sección Hero de las pantallas
 * Maneja la imagen de fondo, gradiente, botones y contenido customizable
 * 
 * @example
 * ```tsx
 * <HeroSection
 *   backgroundImage={coverUrl}
 *   height={320}
 *   onMorePress={() => setMenuOpen(true)}
 * >
 *   <View style={styles.heroContent}>
 *     <Image source={{ uri: coverUrl }} style={styles.cover} />
 *     <Text style={styles.title}>{album.title}</Text>
 *   </View>
 * </HeroSection>
 * ```
 */
export default function HeroSection({
  backgroundImage,
  height = 320,
  blurRadius = 40,
  gradientColors = [
    "transparent",
    "rgba(0,0,0,0.35)",
    "rgba(0,0,0,0.75)",
    "#0e0e0e",
  ],
  gradientLocations = [0.55, 0.80, 0.95, 1],
  onMorePress,
  children,
  useDirectImage = false,
  contentPosition = "flex-end",
}: HeroSectionProps) {
  return (
    <View style={[styles.container, { height, justifyContent: contentPosition }]}>
      {/* Fondo */}
      {backgroundImage ? (
        useDirectImage ? (
          <>
            <Image
              source={{ uri: backgroundImage }}
              style={styles.backgroundImage}
            />
            <LinearGradient
              colors={gradientColors}
              locations={gradientLocations}
              style={styles.gradient}
            />
          </>
        ) : (
          <ImageBackground
            source={{ uri: backgroundImage }}
            style={StyleSheet.absoluteFill}
            blurRadius={blurRadius}
            resizeMode="cover"
            imageStyle={{ backgroundColor: "#000" }}
          >
            <LinearGradient
              colors={gradientColors}
              locations={gradientLocations}
              style={StyleSheet.absoluteFill}
            />
          </ImageBackground>
        )
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.fallbackBg]} />
      )}

      {/* Botón volver */}
      <BackButton />

      {/* Botón más opciones (3 puntos) */}
      {onMorePress && (
        <TouchableOpacity style={styles.moreButton} onPress={onMorePress}>
          <Ionicons name="ellipsis-vertical" size={18} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Contenido customizable */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    backgroundColor: "#0e0e0e",
  },
  backgroundImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
    position: "absolute",
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "65%",
  },
  fallbackBg: {
    backgroundColor: "#0e0e0e",
  },
  moreButton: {
    position: "absolute",
    top: 40,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 8,
    borderRadius: 20,
    zIndex: 10,
  },
});