import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

/**
 * Props:
 * - backgroundImage: URL de la imagen de fondo
 * - title: Título principal (artista/álbum/playlist)
 * - sections: Array de secciones a renderizar
 * - renderSection: Función para renderizar cada sección (section, index) => ReactElement | null
 * - onBackPress: Callback al presionar el botón back
 * - contentPaddingHorizontal: Padding horizontal para el contenido (default: 0)
 * - contentContainerStyle: Estilos extra para el contentContainerStyle
 */
interface AnimatedHeaderProps {
    backgroundImage: string;
    dominantColor?: string;
    title: string;
    sections: any[];
    renderSection: (section: any, index: number) => React.ReactElement | null;
    onBackPress?: () => void;
    contentPaddingHorizontal?: number;
    contentContainerStyle?: any;
}

// SEE: https://docs.swmansion.com/react-native-reanimated/docs/animations/withTiming
export default function AnimatedHeader({
    backgroundImage,
    dominantColor,
    title,
    sections,
    renderSection,
    onBackPress,
    contentPaddingHorizontal = 0,
    contentContainerStyle,
}: AnimatedHeaderProps) {
    const scrollY = useSharedValue(0);
    const insets = useSafeAreaInsets();

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
        return { transform: [{ scale }] };
    });

    const largeTitleStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            scrollY.value,
            [100, 200, 250],
            [1, 0.5, 0],
            Extrapolation.CLAMP
        );
        const translateY = interpolate(
            scrollY.value,
            [0, 300],
            [0, -30],
            Extrapolation.CLAMP
        );
        return { opacity, transform: [{ translateY }] };
    });

    const collapsedHeaderStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            scrollY.value,
            [260, 330],
            [0, 1],
            Extrapolation.CLAMP
        );
        return { opacity };
    });

    const fixedBackButtonStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            scrollY.value,
            [240, 310],
            [1, 0],
            Extrapolation.CLAMP
        );
        return { opacity };
    });

    const listHeader = (
        <View style={styles.headerContainer}>
            <Animated.View style={[StyleSheet.absoluteFill, heroImageStyle]}>
                <Image
                    source={backgroundImage}
                    style={styles.backgroundImage}
                    contentFit="cover"
                />
            </Animated.View>
            <LinearGradient
                colors={["transparent", "rgba(14, 14, 14, 0.8)", "#0e0e0e"]}
                style={styles.gradient}
                locations={[0, 0.7, 1]}
            />
            <Animated.View style={[styles.heroInfo, largeTitleStyle]}>
                <Text style={styles.artist_name}>{title}</Text>
            </Animated.View>
        </View>
    );

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.collapsedHeader, collapsedHeaderStyle, dominantColor ? { backgroundColor: dominantColor } : undefined]}>
                {!dominantColor && <BlurView intensity={80} style={StyleSheet.absoluteFillObject} tint="dark" />}
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
                    <View style={{ paddingHorizontal: contentPaddingHorizontal }}>
                        {renderSection(item, index)}
                    </View>
                )}
                keyExtractor={(item, index) => `section-${item.type || index}`}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={listHeader}
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
    headerContainer: {
        width: SCREEN_WIDTH,
        height: 400,
        overflow: "hidden",
        alignSelf: "center",
    },
    backgroundImage: {
        ...StyleSheet.absoluteFillObject,
    },
    gradient: {
        ...StyleSheet.absoluteFillObject,
    },
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
    heroInfo: {
        position: "absolute",
        bottom: 20,
        left: 16,
        right: 16,
    },
    artist_name: {
        fontSize: 34,
        fontWeight: "900",
        color: "#fff",
        marginBottom: 4,
    },
    contentContainer: {
        backgroundColor: "#0e0e0e",
    },
});