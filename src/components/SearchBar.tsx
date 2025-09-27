import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useRef } from "react";
import { Animated, StyleSheet, TextInput, TouchableOpacity } from "react-native";

type Props = { placeholder?: string };

export default function SearchBar({ placeholder = "Buscar canción o artista..." }: Props) {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);

  // anim sutil
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    Animated.parallel([
      Animated.timing(scale, { toValue: 0.995, duration: 80, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.96, duration: 80, useNativeDriver: true }),
    ]).start();
  };

  const pressOut = () => {
    Animated.parallel([
      Animated.timing(scale, { toValue: 1, duration: 90, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 90, useNativeDriver: true }),
    ]).start();
  };

  const go = () => {
    router.push("/search"); // navegación inmediata; el fade lo hace SearchPanel
  };

  return (
    <Animated.View style={[styles.searchBar, { transform: [{ scale }], opacity }]}>
      <Ionicons name="search" size={20} color="#888" />
      <TouchableOpacity
        style={{ flex: 1 }}
        activeOpacity={0.9}
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={go}
      >
        <TextInput
          ref={inputRef}
          placeholder={placeholder}
          placeholderTextColor="#aaa"
          style={styles.searchInput}
          editable={false}
          pointerEvents="none"
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#141414",
    borderRadius: 28,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: { flex: 1, marginHorizontal: 10, color: "#fff" },
});