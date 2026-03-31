import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { ReactNode } from "react";
import {
  ImageBackground,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import BackButton from "./BackButton";

interface HeroSectionProps {
  backgroundImage?: string;
  height?: number;
  blurRadius?: number;
  gradientColors?: string[];
  gradientLocations?: number[];
  onMorePress?: () => void;
  children: ReactNode;
  useDirectImage?: boolean;
  contentPosition?: "flex-start" | "center" | "flex-end";

  /**
   * Padding bottom del container (default: 12)
   */
  paddingBottom?: number;

  /**
   * Padding top del container (default: 0)
   */
  paddingTop?: number;

  /**
   * Estilos adicionales para el container principal
   */
  containerStyle?: ViewStyle;
}

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
  paddingBottom = 12,
  paddingTop = 0,
  containerStyle,
}: HeroSectionProps) {
  return (
    <View
      style={[
        styles.container,
        {
          height,
          justifyContent: contentPosition,
          paddingBottom,
          paddingTop,
        },
        containerStyle
      ]}
    >
      {/* Fondo */}
      {backgroundImage ? (
        useDirectImage ? (
          <>
            <Image
              source={backgroundImage}
              style={styles.backgroundImage}
              contentFit="cover"
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
    position: "absolute",
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "45%",
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