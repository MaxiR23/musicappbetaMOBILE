// app/album/[id].tsx
import TrackActionsSheet from "@/src/components/TrackActionsSheet";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AlbumSkeletonLayout } from "../../src/components/skeletons/Skeleton";
import { useMusic } from "../../src/hooks/use-music";
import { useMusicApi } from "../../src/hooks/use-music-api";
import { getThemeFromImage } from "../../src/utils/colorUtils.native";

export default function AlbumScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [album, setAlbum] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [heroColor, setHeroColor] = useState<string>("#222");

  const { playFromList, currentSong } = useMusic();
  const { getAlbum } = useMusicApi();
  const router = useRouter();

  const [actionsOpen, setActionsOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<any | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getAlbum(id as string)
      .then(async (data) => {
        setAlbum(data);
        try {
          const url =
            data?.info?.thumbnails?.[data.info.thumbnails.length - 1]?.url ||
            data?.info?.thumbnails?.[0]?.url;

          console.log("📸 URL de imagen:", url);

          if (url && typeof getThemeFromImage === "function") {
            const col = await getThemeFromImage(url);

            console.log("🎨 Respuesta completa de getThemeFromImage:", JSON.stringify(col, null, 2));

            const paletteData = col?.palette || col?.colors || col;
            console.log("🎨 Paleta a procesar:", JSON.stringify(paletteData, null, 2));

            const pick = pickHex(paletteData) || "#222";
            console.log("✅ Color final seleccionado:", pick);

            setHeroColor(pick);
          }
        } catch (err) {
          console.error("❌ Error extrayendo color:", err);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("❌ Error cargando álbum:", err);
        setLoading(false);
      });
  }, [id]);

  // Reemplazá SOLO esta función
  // Reemplazá SOLO esta función
  function pickHex(palette: any): string | undefined {
    // 0) si viene nuestro formato (getThemeFromImage), usar 'accent'
    if (palette && typeof palette.accent === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(palette.accent)) {
      return palette.accent;
    }
    // evitar tomar '#000'/'#fff' provenientes de 'textOnAccent'
    const isHex = (s: any) => typeof s === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s);
    const isBad = (s: string) => /^#0{3,6}$/i.test(s) || /^#f{3,6}$/i.test(s);

    // 1) claves típicas de librerías de colores
    const pref = [
      "dominant", "vibrant", "darkVibrant", "lightVibrant",
      "muted", "lightMuted", "darkMuted", "primary", "secondary", "average", "background",
      // variantes comunes de react-native-image-colors
      "Vibrant", "DarkVibrant", "LightVibrant", "Muted", "DarkMuted", "LightMuted",
    ];
    const toHex = (v: any): string | undefined => {
      if (!v) return;
      if (isHex(v) && !isBad(v)) return v;
      if (typeof v === "object") {
        if (isHex(v.hex) && !isBad(v.hex)) return v.hex;
        if ([v.r, v.g, v.b].every((x: any) => Number.isFinite(x))) {
          const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
          const hex = `#${c(v.r)}${c(v.g)}${c(v.b)}`;
          return isBad(hex) ? undefined : hex;
        }
      }
      if (Array.isArray(v) && v.length >= 3) {
        const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
        const hex = `#${c(v[0])}${c(v[1])}${c(v[2])}`;
        return isBad(hex) ? undefined : hex;
      }
      return undefined;
    };

    // 2) probar por claves conocidas
    for (const k of pref) {
      const hex = toHex(palette?.[k]);
      if (hex) return hex;
    }

    // 3) DFS pero: ignorar 'textOnAccent' y strings 'rgba(...)'
    const stack = [palette];
    while (stack.length) {
      const it = stack.pop();
      const hex = toHex(it);
      if (hex) return hex;
      if (it && typeof it === "object") {
        for (const [k, v] of Object.entries(it)) {
          if (k === "textOnAccent") continue;
          if (typeof v === "string" && /^rgba?\(/i.test(v)) continue;
          stack.push(v);
        }
      }
    }
    return "#222";
  }

  function hexToRgba(hex: string, a: number) {
    const m = hex.replace("#", "");
    const v =
      m.length === 3
        ? m.split("").map((x) => parseInt(x + x, 16))
        : [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
    return `rgba(${v[0]},${v[1]},${v[2]},${a})`;
  }

  const coverUrl =
    album?.info?.thumbnails?.[album?.info?.thumbnails?.length - 1]?.url ||
    album?.info?.thumbnails?.[0]?.url ||
    "";

  const mappedSongs = useMemo(() => {
    if (!album) return [];
    const albumIdFromRoute = (id ?? null) as string | null;

    return album.tracks.map((s: any) => {
      const artists = Array.isArray(s.artists) ? s.artists : [];
      const primary = artists[0] || null;

      const artistName =
        s.artistName ??
        (artists.length ? artists.map((a: any) => a.name).join(", ") : "");

      const artistId =
        s.artistId ??
        (primary && primary.id ? primary.id : null);

      const trackId = s.videoId || s.id;

      return {
        id: trackId,
        title: s.title,
        artistName,
        artistId,
        artists,
        albumId: albumIdFromRoute,
        duration: s.duration || null,
        durationSeconds: s.durationSeconds || null,
        thumbnail: coverUrl || "",
      };
    });
  }, [album, id, coverUrl]);

  const albumMeta = useMemo(() => {
    if (!album?.info) return "";
    const { year, songCount, durationText } = album.info as {
      year?: number; songCount?: number; durationText?: string;
    };

    const parts: string[] = [];

    if (year) parts.push(String(year));
    if (typeof songCount === "number") {
      parts.push(`${songCount} ${songCount === 1 ? "canción" : "canciones"}`);
    }
    if (durationText) {
      let dt = String(durationText);
      dt = dt
        .replace(/\bminutes?\b/gi, "min")
        .replace(/\bminutos?\b/gi, "min")
        .replace(/\bhours?\b/gi, "h")
        .replace(/\bhoras?\b/gi, "h");
      parts.push(dt);
    }

    return parts.join(" • ");
  }, [album]);

  // ---- NUEVO: datos para mostrar mini artista(s) debajo del título ----
  const artistThumbUrl =
    album?.info?.straplineThumbnail?.[0]?.url ||
    album?.info?.thumbnails?.[0]?.url ||
    "";

  const artistNames =
    (album?.info?.includedArtists?.length
      ? (album.info.includedArtists as any[])
          .map(a => a?.name)
          .filter(Boolean)
      : (album?.info?.artistName ? [album.info.artistName] : [])
    ).join(", ");

  // ---- NUEVO: flag para ocultar UI si no hay tracks ----
  const hasTracks = !!(album?.tracks && album.tracks.length > 0);

  if (loading || !album) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
        <AlbumSkeletonLayout
          theme={{ baseColor: "#2a2a2a", highlightColor: "#3b3b3b", duration: 1200 }}
          tracks={6}
          heroHeight={360}
        />
      </ScrollView>
    );
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: currentSong ? 18 : 32 }}>
        <ImageBackground
          source={{ uri: coverUrl }}
          style={styles.hero}
          blurRadius={50}
          resizeMode="cover"
          imageStyle={{ backgroundColor: "#000" }}
        >
          <LinearGradient
            colors={["rgba(0,0,0,0.20)", "rgba(0,0,0,0.85)"]}
            style={StyleSheet.absoluteFillObject}
          />

          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.heroCoverWrap}>
            <Image source={{ uri: coverUrl }} style={styles.heroCover} />
          </View>
        </ImageBackground>

        {/* Info debajo del hero */}
        <View style={styles.infoBlock}>
          <Text style={styles.albumTitle}>{album.info?.title}</Text>

          {/* NUEVO: mini avatar + nombres de artista(s) */}
          {!!artistNames && (
            <View style={styles.artistRow}>
              {!!artistThumbUrl && (
                <Image source={{ uri: artistThumbUrl }} style={styles.artistAvatar} />
              )}
              <Text style={styles.artistName}>{artistNames}</Text>
            </View>
          )}

          {!!albumMeta && <Text style={styles.albumMeta}>{albumMeta}</Text>}
          {!!album.info?.subtitle && <Text style={styles.albumSubtitle}>{album.info?.subtitle}</Text>}
          {!!album.info?.secondSubtitle && <Text style={styles.albumSubtitle}>{album.info?.secondSubtitle}</Text>}
        </View>

        {/* Botones */}
        {hasTracks ? (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.softButton}
              onPress={() =>
                playFromList(
                  mappedSongs,
                  0,
                  { type: "album", name: album.info?.title, thumb: coverUrl } // ← PASAMOS THUMB
                )
              }
            >
              <Ionicons name="play" size={18} color="#fff" />
              <Text style={styles.softButtonText}>Reproducir</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.softButtonAlt}
              onPress={() => {
                const randomIndex = Math.floor(Math.random() * mappedSongs.length);
                playFromList(
                  mappedSongs,
                  randomIndex,
                  { type: "album", name: album.info?.title, thumb: coverUrl } // ← PASAMOS THUMB
                );
              }}
            >
              <Ionicons name="shuffle" size={18} color="#fff" />
              <Text style={styles.softButtonText}>Shuffle</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Songs */}
        <View style={styles.section}>
          {hasTracks ? (
            album.tracks.map((song: any, index: number) => (
              <View key={`${song.id || "track"}-${index}`} style={styles.songRow}>
                <Text style={styles.songIndex}>{index + 1}</Text>
                <View style={{ flex: 1 }}>
                  <TouchableOpacity
                    onPress={() =>
                      playFromList(
                        mappedSongs,
                        index,
                        { type: "album", name: album.info?.title, thumb: coverUrl } // ← PASAMOS THUMB
                      )
                    }
                    activeOpacity={0.85}
                  >
                    <Text style={styles.songTitle}>{song.title}</Text>
                    {!!song.artists?.length && (
                      <Text style={styles.songArtists}>
                        {song.artists.map((a: any) => a.name).join(", ")}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
                {/* <Text style={styles.songDuration}>{song.duration}</Text> */}

                <TouchableOpacity
                  onPress={() => {
                    setSelectedTrack(mappedSongs[index]);
                    setActionsOpen(true);
                  }}
                  style={{ padding: 6, marginLeft: 6 }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="ellipsis-vertical" size={16} color="#bbb" />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={[styles.songArtists, { marginTop: 8 }]}>
              Songs unavailable for this release.
            </Text>
          )}
        </View>

        {/* Upcoming event */}
        {!!album.upcomingEvents?.length && (() => {
          const ev = album.upcomingEvents[0];
          const artistName =
            album?.info?.artistName ||
            album?.info?.artists?.[0]?.name ||
            "";

          const isFestival =
            /fest(ival)?/i.test(ev?.name || "") || (ev?.attractions?.length || 0) >= 4;

          // supporters/openers: attractions menos la artista principal (case-insensitive)
          const openers = (ev?.attractions || []).filter((a: any) =>
            artistName ? (a?.name || "").toLowerCase() !== artistName.toLowerCase() : true
          );

          const whenLocal = ev?.start?.localDate
            ? `${ev.start.localDate}${ev.start.localTime ? " " + ev.start.localTime : ""}`
            : "TBA";

          const venueLine = [ev?.venue?.name, ev?.venue?.city, ev?.venue?.country]
            .filter(Boolean)
            .join(" • ");

          const mapUrl =
            ev?.venue?.lat && ev?.venue?.lon
              ? `https://maps.google.com/?q=${ev.venue.lat},${ev.venue.lon}`
              : undefined;

          const poster = ev?.image || album?.info?.thumbnails?.[0]?.url || "";

          return (
            <View style={{ paddingHorizontal: 16, marginTop: 8, gap: 10 }}>
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 6 }}>
                Upcoming event
              </Text>

              <TouchableOpacity
                disabled
                activeOpacity={0.9}
                /* onPress={() => ev?.url && router.push({ pathname: "/webview", params: { url: ev.url } })} */
                style={{
                  backgroundColor: "#151515",
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: "#222",
                  overflow: "hidden"
                }}
              >
                {!!poster && (
                  <Image source={{ uri: poster }} style={{ width: "100%", height: 160 }} />
                )}
                <View style={{ padding: 12 }}>
                  <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }} numberOfLines={2}>
                    {ev?.name}
                  </Text>

                  {/* Fecha + hora (con ícono calendario) */}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <Ionicons name="calendar-outline" size={14} color="#bbb" />
                    <Text style={{ color: "#bbb" }}>
                      {whenLocal} {ev?.start?.timezone ? `• ${ev.start.timezone}` : ""}
                    </Text>
                  </View>

                  {/* Lugar (con ícono ubicación) */}
                  {!!venueLine && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                      <Ionicons name="location-outline" size={14} color="#bbb" />
                      <Text style={{ color: "#bbb", flexShrink: 1 }}>{venueLine}</Text>
                    </View>
                  )}

                  {/* Seatmap / Map links */}
                  {/* ... */}
                  {(isFestival ? (ev?.attractions?.length > 0) : (openers.length > 0)) && (
                    <View style={{ marginTop: 10 }}>
                      <Text style={{ color: "#fff", fontWeight: "700", marginBottom: 6 }}>
                        {isFestival ? "Lineup" : "With"}
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} onStartShouldSetResponderCapture={() => true}>
                        {(isFestival ? ev.attractions : openers).slice(0, 12).map((a: any, i: number) => (
                          <View
                            key={`${a.id || a.name}-${i}`}
                            style={{
                              paddingVertical: 6,
                              paddingHorizontal: 10,
                              borderRadius: 14,
                              backgroundColor: "#1e1e1e",
                              borderWidth: 1,
                              borderColor: "#2a2a2a",
                              marginRight: 8
                            }}
                          >
                            <Text style={{ color: "#ddd", fontSize: 12 }}>{a.name}</Text>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          );
        })()}

        {/* Other versions / Releases for you */}
        {(album.otherVersions?.length || album.releasesForYou?.length) ? (
          <View style={{ paddingHorizontal: 16, marginTop: 8, gap: 18 }}>
            {/* Other versions */}
            {!!album.otherVersions?.length && (
              <View>
                <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 10 }}>
                  Other versions
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {album.otherVersions.map((it: any, i: number) => {
                    const thumb =
                      it.thumbnails?.[it.thumbnails.length - 1]?.url ||
                      it.thumbnails?.[0]?.url || coverUrl;
                    return (
                      <TouchableOpacity
                        key={`ov-${i}-${it.browseId || it.title}`}
                        style={{ width: 140, marginRight: 12 }}
                        activeOpacity={0.85}
                        onPress={() => router.push(`/album/${it.browseId}`)}
                      >
                        <Image source={{ uri: thumb }} style={{ width: 140, height: 140, borderRadius: 10 }} />
                        <Text numberOfLines={1} ellipsizeMode="tail" style={{ color: "#fff", marginTop: 6, fontWeight: "600" }}>
                          {it.title}
                        </Text>
                        <Text numberOfLines={1} style={{ color: "#aaa", fontSize: 12, marginTop: 2 }}>
                          {it.type}{it.artistName ? ` • ${it.artistName}` : ""}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* More from artist */}
            {!!album.moreFromArtist?.length && (
              <View>
                <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 10 }}>
                  More from artist
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {album.moreFromArtist.map((it: any, i: number) => {
                    const thumb =
                      it.thumbnails?.[it.thumbnails.length - 1]?.url ||
                      it.thumbnails?.[0]?.url || coverUrl;
                    return (
                      <TouchableOpacity
                        key={`mfa-${i}-${it.id || it.title}`}
                        style={{ width: 140, marginRight: 12 }}
                        activeOpacity={0.85}
                        onPress={() => router.push(`/album/${it.id}`)}
                      >
                        <Image source={{ uri: thumb }} style={{ width: 140, height: 140, borderRadius: 10 }} />
                        <Text numberOfLines={1} ellipsizeMode="tail" style={{ color: "#fff", marginTop: 6, fontWeight: "600" }}>
                          {it.title}
                        </Text>
                        <Text numberOfLines={1} style={{ color: "#aaa", fontSize: 12, marginTop: 2 }}>
                          {it.type || "Album"}{it.year ? ` • ${it.year}` : ""}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Releases for you */}
            {!!album.releasesForYou?.length && (
              <View>
                <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 10 }}>
                  Releases for you
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {album.releasesForYou.map((it: any, i: number) => {
                    const thumb =
                      it.thumbnails?.[it.thumbnails.length - 1]?.url ||
                      it.thumbnails?.[0]?.url || coverUrl;
                    const route =
                      (it.type || "").toLowerCase() === "playlist"
                        ? `/playlist/${it.browseId}`
                        : `/album/${it.browseId}`;
                    return (
                      <TouchableOpacity
                        key={`rfy-${i}-${it.browseId || it.title}`}
                        style={{ width: 140, marginRight: 12 }}
                        activeOpacity={0.85}
                        onPress={() => router.push(route)}
                      >
                        <Image source={{ uri: thumb }} style={{ width: 140, height: 140, borderRadius: 10 }} />
                        <Text numberOfLines={1} ellipsizeMode="tail" style={{ color: "#fff", marginTop: 6, fontWeight: "600" }}>
                          {it.title}
                        </Text>
                        <Text numberOfLines={1} style={{ color: "#aaa", fontSize: 12, marginTop: 2 }}>
                          {it.type || "Release"}{it.artistName ? ` • ${it.artistName}` : ""}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>
        ) : null}

      </ScrollView>

      <TrackActionsSheet
        open={actionsOpen}
        onOpenChange={setActionsOpen}
        track={selectedTrack}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0e0e0e" },
  hero: { height: 320, position: "relative", justifyContent: "flex-end" },
  heroGradientFull: { ...StyleSheet.absoluteFillObject },
  heroCoverWrap: {
    alignSelf: "center",
    marginBottom: 18,
    borderRadius: 14,
    overflow: "hidden",
    // sombra
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  heroCover: { width: 220, height: 220, borderRadius: 14, resizeMode: "cover" },
  backButton: {
    position: "absolute",
    top: 40,
    left: 20,
    backgroundColor: "#0008",
    padding: 8,
    borderRadius: 20,
  },

  infoBlock: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  albumTitle: { fontSize: 28, fontWeight: "bold", color: "#fff" },

  // NUEVO
  artistRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  artistAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#333",
  },
  artistName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  albumMeta: { fontSize: 13, color: "#bbb", marginTop: 6 },
  albumSubtitle: { fontSize: 14, color: "#ccc", marginTop: 2 },

  actions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: "center",
  },

  softButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.10)",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  softButtonAlt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  softButtonText: { color: "#fff", fontWeight: "600" },

  section: { paddingHorizontal: 16, marginTop: 8 },
  songRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  songIndex: { color: "#aaa", width: 20, textAlign: "center", marginRight: 8 },
  songThumb: { width: 40, height: 40, borderRadius: 4, marginHorizontal: 8 },
  songTitle: { flex: 1, color: "#fff" },
  songArtists: { color: "#aaa", fontSize: 12, marginTop: 2 },
  songDuration: { color: "#aaa", width: 50, textAlign: "right" },

  skeletonBox: { backgroundColor: "#2a2a2a", borderRadius: 8, opacity: 0.6 },
  skeletonLine: { backgroundColor: "#2a2a2a", borderRadius: 4, opacity: 0.6 },
});