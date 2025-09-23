import React, { useEffect, useState, useMemo } from "react";
import {
    View,
    Text,
    Image,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMusic } from "@/hooks/use-music";
import { useMusicApi } from "@/hooks/use-music-api";

export default function ArtistScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [artist, setArtist] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);

    const { playFromList } = useMusic();
    const { getArtist } = useMusicApi();
    const router = useRouter();

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        getArtist(id as string)
            .then((data) => {
                setArtist(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Error cargando artista:", err);
                setLoading(false);
            });
    }, [id]);

    const mappedTop = useMemo(() => {
        if (!artist) return [];
        return artist.topSongs.map((s: any) => ({
            id: s.id,
            artistId: s.artistId ?? null,
            artistName: artist.header.name,
            albumId: s.albumId,
            duration: s.duration,
            durationSeconds: s.durationSeconds,
            title: s.title,
            thumbnail: s.thumbnail || artist.header.thumbnails[0]?.url,
            url: "",
        }));
    }, [artist]);

    // --- ⏳ Skeleton Loader ---
    if (loading || !artist) {
        return (
            <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
                <View style={styles.hero}>
                    <View style={styles.skeletonBox} />
                </View>

                <View style={styles.section}>
                    <View style={[styles.skeletonLine, { width: 200, height: 28, marginBottom: 20 }]} />
                    {[...Array(5)].map((_, i) => (
                        <View key={i} style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
                            <View style={[styles.skeletonBox, { width: 40, height: 40, borderRadius: 8 }]} />
                            <View style={[styles.skeletonLine, { width: "60%", height: 18, marginLeft: 12 }]} />
                        </View>
                    ))}
                </View>

                <View style={styles.section}>
                    <View style={[styles.skeletonLine, { width: 150, height: 28, marginBottom: 20 }]} />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {[...Array(4)].map((_, i) => (
                            <View
                                key={i}
                                style={[
                                    styles.skeletonBox,
                                    { width: 140, height: 140, borderRadius: 8, marginRight: 16 },
                                ]}
                            />
                        ))}
                    </ScrollView>
                </View>
            </ScrollView>
        );
    }

    // --- 🎤 Pantalla real ---
    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
            {/* Hero Section */}
            <View style={styles.hero}>
                <Image
                    source={{ uri: artist?.header?.thumbnails?.[0]?.url }}
                    style={styles.heroImage}
                />
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.heroInfo}>
                    <Image
                        source={{
                            uri: artist?.header?.thumbnails?.[artist?.header?.thumbnails.length - 1]?.url,
                        }}
                        style={styles.avatar}
                    />
                    <Text style={styles.artistName}>{artist?.header?.name}</Text>
                    <Text style={styles.listeners}>{artist?.header?.monthlyListeners}</Text>
                </View>
            </View>

            {/* Top Songs */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Canciones Populares</Text>
                {artist.topSongs.map((song: any, index: number) => (
                    <TouchableOpacity
                        key={song.id}
                        style={styles.songRow}
                        onPress={() =>
                            playFromList(mappedTop, index, { type: "artist", name: artist.header?.name })
                        }
                    >
                        <Text style={styles.songIndex}>{index + 1}</Text>
                        <Image source={{ uri: song.thumbnail }} style={styles.songThumb} />
                        <Text style={styles.songTitle}>{song.title}</Text>
                        <Text style={styles.songDuration}>{song.duration}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Albums */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Álbumes</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {artist.albums.map((album: any) => (
                        <TouchableOpacity
                            key={album.id}
                            style={styles.albumCard}
                            onPress={() => router.push(`/album/${album.id}`)}
                        >
                            <Image source={{ uri: album.thumbnails?.[0]?.url }} style={styles.albumImage} />
                            <Text style={styles.albumTitle}>{album.title}</Text>
                            <Text style={styles.albumYear}>{album.year}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Related Artists */}
            {artist?.related && artist.related.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Artistas Relacionados</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {artist.related.map((rel: any) => (
                            <TouchableOpacity
                                key={rel.id}
                                style={styles.relatedCard}
                                onPress={() => router.push(`/artist/${rel.id}`)}
                            >
                                <Image
                                    source={{ uri: rel.thumbnails?.[0]?.url || "https://via.placeholder.com/100" }}
                                    style={styles.relatedImage}
                                />
                                <Text style={styles.relatedName}>{rel.name}</Text>
                                <Text style={styles.relatedSubtitle}>{rel.subtitle}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0e0e0e" },

    // --- Loader Skeletons ---
    skeletonBox: {
        backgroundColor: "#2a2a2a",
        opacity: 0.6,
    },
    skeletonLine: {
        backgroundColor: "#2a2a2a",
        borderRadius: 4,
    },

    // --- Hero ---
    hero: { height: 300, position: "relative" },
    heroImage: { width: "100%", height: "100%", resizeMode: "cover" },
    backButton: {
        position: "absolute",
        top: 40,
        left: 20,
        backgroundColor: "#0008",
        padding: 8,
        borderRadius: 20,
    },
    heroInfo: { position: "absolute", bottom: 20, left: 20 },
    avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: "#1DB954" },
    artistName: { fontSize: 28, fontWeight: "bold", color: "#fff", marginTop: 8 },
    listeners: { fontSize: 14, color: "#ccc" },

    // --- Sections ---
    section: { padding: 16 },
    sectionTitle: { fontSize: 20, fontWeight: "bold", color: "#fff", marginBottom: 12 },

    // --- Top Songs ---
    songRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
    songIndex: { color: "#aaa", width: 20, textAlign: "center" },
    songThumb: { width: 40, height: 40, borderRadius: 4, marginHorizontal: 8 },
    songTitle: { flex: 1, color: "#fff" },
    songDuration: { color: "#aaa", width: 50, textAlign: "right" },

    // --- Albums ---
    albumCard: { marginRight: 16, width: 140 },
    albumImage: { width: "100%", height: 140, borderRadius: 8 },
    albumTitle: { color: "#fff", fontWeight: "600", marginTop: 4 },
    albumYear: { color: "#aaa", fontSize: 12 },

    // --- Related Artists ---
    relatedCard: { marginRight: 16, alignItems: "center" },
    relatedImage: { width: 100, height: 100, borderRadius: 50 },
    relatedName: { color: "#fff", marginTop: 6, fontWeight: "600" },
    relatedSubtitle: { color: "#aaa", fontSize: 12 },
});
