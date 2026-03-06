import { formatEventDateTime } from "@/utils/durations";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface EventCardProps {
  event: any;
  artist_name?: string;
  defaultPoster?: string;
  variant?: "compact" | "featured"; // compact para lista, featured para destacado
  onPress?: () => void;
}

export default function EventCard({
  event,
  artist_name,
  defaultPoster,
  variant = "compact",
  onPress,
}: EventCardProps) {
  const when = formatEventDateTime(event);
  const venueLine = [event?.venue?.name, event?.venue?.city, event?.venue?.country]
    .filter(Boolean)
    .join(" • ");

  // Detectar si es festival
  const isFestival =
    /fest(ival)?/i.test(event?.name || "") || (event?.attractions?.length || 0) >= 4;

  // Openers (attractions menos el artista principal)
  const openers = (event?.attractions || []).filter((a: any) =>
    artist_name ? (a?.name || "").toLowerCase() !== artist_name.toLowerCase() : true
  );

  const poster = event?.image || defaultPoster || "";
  const showLineup = isFestival ? event?.attractions?.length > 0 : openers.length > 0;

  if (variant === "featured") {
    return (
      <TouchableOpacity
        disabled={!onPress}
        onPress={onPress}
        activeOpacity={0.9}
        style={styles.featuredCard}
      >
        {!!poster && <Image source={{ uri: poster }} style={styles.featuredPoster} />}
        
        <View style={styles.featuredContent}>
          <Text style={styles.featuredTitle} numberOfLines={2}>
            {event?.name}
          </Text>

          {/* Fecha */}
          <View style={styles.row}>
            <Ionicons name="calendar-outline" size={14} color="#bbb" />
            <Text style={styles.meta}>
              {when} {event?.start?.timezone ? `• ${event.start.timezone}` : ""}
            </Text>
          </View>

          {/* Lugar */}
          {!!venueLine && (
            <View style={styles.row}>
              <Ionicons name="location-outline" size={14} color="#bbb" />
              <Text style={styles.meta}>{venueLine}</Text>
            </View>
          )}

          {/* Lineup/Openers */}
          {showLineup && (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.lineupTitle}>
                {isFestival ? "Lineup" : "With"}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                onStartShouldSetResponderCapture={() => true}
              >
                {(isFestival ? event.attractions : openers).slice(0, 12).map((a: any, i: number) => (
                  <View key={`${a.id || a.name}-${i}`} style={styles.lineupPill}>
                    <Text style={styles.lineupText}>{a.name}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  // Compact variant (para listas)
  return (
    <TouchableOpacity
      disabled={!onPress}
      onPress={onPress}
      activeOpacity={0.9}
      style={styles.compactCard}
    >
      <View style={styles.compactContent}>
        <Text numberOfLines={2} style={styles.compactTitle}>
          {event?.name}
        </Text>

        <View style={styles.row}>
          <Ionicons name="calendar-outline" size={14} color="#bbb" />
          <Text style={styles.meta} numberOfLines={1}>
            {when || "Por confirmar"}
          </Text>
        </View>

        <View style={styles.row}>
          <Ionicons name="location-outline" size={14} color="#bbb" />
          <Text style={styles.meta} numberOfLines={1}>
            {venueLine}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Featured (destacado con poster)
  featuredCard: {
    backgroundColor: "#151515",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222",
    overflow: "hidden",
  },
  featuredPoster: {
    width: "100%",
    height: 160,
  },
  featuredContent: {
    padding: 12,
  },
  featuredTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  // Compact (lista simple)
  compactCard: {
    backgroundColor: "#161616",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#242424",
    padding: 12,
    marginBottom: 10,
  },
  compactContent: {
    flex: 1,
    gap: 6,
  },
  compactTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  // Shared
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  meta: {
    color: "#bbb",
    fontSize: 12,
    flexShrink: 1,
  },

  // Lineup
  lineupTitle: {
    color: "#fff",
    fontWeight: "700",
    marginBottom: 6,
  },
  lineupPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: "#1e1e1e",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    marginRight: 8,
  },
  lineupText: {
    color: "#ddd",
    fontSize: 12,
  },
});