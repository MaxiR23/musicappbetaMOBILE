import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useRef } from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

type Props = {
  placeholder?: string;
};

export default function SearchBar({ placeholder = "Buscar canción o artista..." }: Props) {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);

  return (
    <View style={styles.searchBar}>
      <Ionicons name="search" size={20} color="#888" />
      <TouchableOpacity
        style={{ flex: 1 }}
        activeOpacity={0.9}
        onPress={() => router.push("/search")}
      >
        {/* Input “fake” solo para look; no editable en Home */}
        <TextInput
          ref={inputRef}
          placeholder={placeholder}
          placeholderTextColor="#aaa"
          style={styles.searchInput}
          editable={false}
          pointerEvents="none"
        />
      </TouchableOpacity>
    </View>
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