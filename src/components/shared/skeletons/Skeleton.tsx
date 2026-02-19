import { LinearGradient } from "expo-linear-gradient";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

// Tipos: ancho acepta número o porcentaje tipo '100%'
type Dim = number | `${number}%`;

type SkeletonTheme = {
  baseColor: string;
  highlightColor: string;
  duration: number; // ms
};

const DefaultTheme: SkeletonTheme = {
  baseColor: "#2a2a2a",
  highlightColor: "#3b3b3b",
  duration: 1400,
};

const Ctx = createContext<SkeletonTheme>(DefaultTheme);

export function SkeletonProvider({
  children,
  baseColor,
  highlightColor,
  duration,
}: Partial<SkeletonTheme> & { children: React.ReactNode }) {
  const value = useMemo(
    () => ({
      baseColor: baseColor ?? DefaultTheme.baseColor,
      highlightColor: highlightColor ?? DefaultTheme.highlightColor,
      duration: duration ?? DefaultTheme.duration,
    }),
    [baseColor, highlightColor, duration]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function useTheme() {
  return useContext(Ctx);
}

type BoxProps = {
  width?: Dim;
  height?: number;
  radius?: number;
  shimmer?: boolean;
  style?: StyleProp<ViewStyle>;
  /** ancho relativo del highlight (0.2 = 20%) */
  highlightWidthRatio?: number;
};

export function SkeletonBox({
  width = "100%",
  height = 16,
  radius = 8,
  shimmer = true,
  style,
  highlightWidthRatio = 0.45,
}: BoxProps) {
  const theme = useTheme();
  const [measuredW, setMeasuredW] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!shimmer) return;
    const anim = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: theme.duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => {
      progress.stopAnimation();
    };
  }, [progress, theme.duration, shimmer]);

  const gradientW = Math.max(30, measuredW * highlightWidthRatio);
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-gradientW, measuredW + gradientW],
    extrapolate: "clamp",
  });

  return (
    <View
      onLayout={(e) => setMeasuredW(e.nativeEvent.layout.width)}
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: theme.baseColor,
          overflow: "hidden",
        },
        style,
      ]}
      pointerEvents="none"
      accessibilityRole="progressbar"
    >
      {shimmer && measuredW > 0 && (
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            { transform: [{ translateX }] },
          ]}
        >
          <LinearGradient
            colors={[theme.baseColor, theme.highlightColor, theme.baseColor]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[StyleSheet.absoluteFillObject, { width: gradientW }]}
          />
        </Animated.View>
      )}
    </View>
  );
}

export function SkeletonLine(props: Omit<BoxProps, "height"> & { height?: number }) {
  return <SkeletonBox height={props.height ?? 14} radius={props.radius ?? 6} {...props} />;
}

export function SkeletonCircle({
  size = 48,
  ...rest
}: Omit<BoxProps, "height" | "width" | "radius"> & { size?: number }) {
  return <SkeletonBox width={size} height={size} radius={size / 2} {...rest} />;
}

export function SkeletonImage({
  width = 120,
  height = 120,
  radius = 8,
  ...rest
}: BoxProps) {
  return <SkeletonBox width={width} height={height} radius={radius} {...rest} />;
}

/* ====== Layouts opcionales (no obligatorios) ====== */

export function ArtistSkeletonLayout({
  theme,
  rows = 5,
  cards = 4,
}: {
  theme?: Partial<SkeletonTheme>;
  rows?: number;
  cards?: number;
}) {
  return (
    <SkeletonProvider {...theme}>
      <SkeletonBox height={300} />
      <View style={{ padding: 16 }}>
        <SkeletonLine height={26} style={{ width: 220, marginBottom: 12 }} />
        <SkeletonLine height={16} style={{ width: 140, marginBottom: 24 }} />
        {Array.from({ length: rows }).map((_, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
            <SkeletonCircle size={40} />
            <SkeletonLine style={{ marginLeft: 12, width: "70%" }} />
          </View>
        ))}
        <SkeletonLine height={24} style={{ width: 180, marginTop: 12, marginBottom: 12 }} />
        <View style={{ flexDirection: "row" }}>
          {Array.from({ length: cards }).map((_, i) => (
            <SkeletonImage key={i} width={140} height={140} style={{ marginRight: 16 }} />
          ))}
        </View>
      </View>
    </SkeletonProvider>
  );
}

export function AlbumSkeletonLayout({
  theme,
  tracks = 6,
  heroHeight = 360,
}: {
  theme?: Partial<SkeletonTheme>;
  tracks?: number;
  heroHeight?: number;
}) {
  return (
    <SkeletonProvider {...theme}>
      <View style={{ height: heroHeight }}>
        <SkeletonBox height={heroHeight} />
      </View>

      <View style={{ padding: 16 }}>
        <SkeletonLine height={30} style={{ width: 220, marginBottom: 10 }} />
        <SkeletonLine height={16} style={{ width: 160 }} />
      </View>

      <View style={{ padding: 16 }}>
        {Array.from({ length: tracks }).map((_, i) => (
          <View
            key={`album-skel-track-${i}`}
            style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}
          >
            <SkeletonImage width={40} height={40} radius={4} />
            <SkeletonLine height={16} style={{ width: "60%", marginLeft: 12 }} />
          </View>
        ))}
      </View>
    </SkeletonProvider>
  );
}

/* ====== PlaylistSkeletonLayout — SOLO hero + lista de canciones ====== */
export function PlaylistSkeletonLayout({
  theme,
  tracks = 8,
  heroHeight = 320,
}: {
  theme?: Partial<SkeletonTheme>;
  tracks?: number;
  heroHeight?: number;
}) {
  return (
    <SkeletonProvider {...theme}>
      {/* HERO */}
      <View style={{ height: heroHeight }}>
        <SkeletonBox height={heroHeight} />
      </View>

      {/* Lista de canciones (thumb + texto + duración) */}
      <View style={{ padding: 16 }}>
        {Array.from({ length: tracks }).map((_, i) => (
          <View
            key={`playlist-skel-track-${i}`}
            style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}
          >
            <SkeletonImage width={40} height={40} radius={6} />
            <SkeletonLine height={14} style={{ width: "60%", marginLeft: 12 }} />
            <SkeletonLine width={42} height={12} style={{ marginLeft: "auto" }} />
          </View>
        ))}
      </View>
    </SkeletonProvider>
  );
}

/* ====== ReleaseGridSkeletonLayout — Grid 2 columnas para albums/singles ====== */
export function ReleaseGridSkeletonLayout({
  theme,
  count = 6,
}: {
  theme?: Partial<SkeletonTheme>;
  count?: number;
}) {
  return (
    <SkeletonProvider {...theme}>
      <View style={{ 
        flexDirection: "row", 
        flexWrap: "wrap", 
        gap: 12, 
        padding: 12 
      }}>
        {Array.from({ length: count }).map((_, i) => (
          <View 
            key={`release-skeleton-${i}`} 
            style={{ flexBasis: "48%", maxWidth: "48%" }}
          >
            <SkeletonImage width="100%" height={160} radius={12} />
            <SkeletonLine height={16} style={{ marginTop: 8, width: "80%" }} />
            <SkeletonLine height={12} style={{ marginTop: 4, width: "60%" }} />
          </View>
        ))}
      </View>
    </SkeletonProvider>
  );
}