// src/components/shared/GenreCard.tsx
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface GenreCardProps {
  name: string;
  onPress: () => void;
  gradient?: string[];
}

export default React.memo(function GenreCard({
  name,
  onPress,
  gradient,
}: GenreCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={styles.card}
      onPress={onPress}
    >
      <View style={[styles.content, gradient ? null : styles.defaultBg]}>
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 8,
    overflow: "hidden",
  },
  content: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    minHeight: 56,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  defaultBg: {
    backgroundColor: "#161616",
  },
  name: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});