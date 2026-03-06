import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import EventCard from "./EventCard";
interface EventsListProps {
  events: any[];
  artist_name?: string;
  defaultPoster?: string;
  title?: string;
  initialCount?: number;
  maxCount?: number;
  onEventPress?: (event: any) => void;
}

export default function EventsList({
  events,
  artist_name,
  defaultPoster,
  title = "Upcoming events",
  initialCount = 3,
  maxCount = 10,
  onEventPress,
}: EventsListProps) {
  const [showAll, setShowAll] = useState(false);

  if (!events?.length) return null;

  const displayEvents = showAll ? events.slice(0, maxCount) : events.slice(0, initialCount);
  const hasMore = events.length > initialCount;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      {displayEvents.map((event, i) => (
        <EventCard
          key={`event-${event.id || "no-id"}-${i}`}
          event={event}
          artist_name={artist_name}
          defaultPoster={defaultPoster}
          variant="compact"
          onPress={onEventPress ? () => onEventPress(event) : undefined}
        />
      ))}

      {hasMore && (
        <TouchableOpacity
          onPress={() => setShowAll((v) => !v)}
          activeOpacity={0.8}
          style={styles.dividerTouchable}
        >
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{showAll ? "Show less" : "Show more"}</Text>
            <View style={styles.dividerLine} />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 10,
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },
  dividerTouchable: {
    marginTop: 6,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#2a2a2a",
  },
  dividerText: {
    color: "#ccc",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
});