// src/components/shared/SearchBar.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
  onClear?: () => void;
  onPress?: () => void;
  placeholder?: string;
  loading?: boolean;
  autoFocus?: boolean;
  editable?: boolean;
  variant?: "default" | "playlist";
}

export default function SearchBar({
  value,
  onChangeText,
  onSubmit,
  onClear,
  onPress,
  placeholder = "Buscar...",
  loading = false,
  autoFocus = false,
  editable = true,
  variant = "default",
}: SearchBarProps) {
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (autoFocus && editable) {
      const timer = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(timer);
    }
  }, [autoFocus, editable]);

  const handleClear = () => {
    onChangeText("");
    if (onClear) onClear();
  };

  const containerStyle = [
    styles.container,
    variant === "playlist" && styles.containerPlaylist,
  ];

  const content = (
    <View style={containerStyle}>
      <Ionicons name="search" size={20} color="#888" />
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor={variant === "playlist" ? "#ccc" : "#aaa"}
        style={styles.input}
        returnKeyType="search"
        editable={editable}
      />
      {loading && (
        <ActivityIndicator size="small" color="#888" style={styles.loader} />
      )}
      {value.length > 0 && !loading && (
        <TouchableOpacity
          onPress={handleClear}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="close" size={18} color="#bbb" />
        </TouchableOpacity>
      )}
    </View>
  );

  if (!editable && onPress) {
    return (
      <Pressable onPress={onPress}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#141414",
    borderRadius: 28,
    paddingHorizontal: 14,
    height: 44,
    marginHorizontal: 12,
  },
  containerPlaylist: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  input: {
    flex: 1,
    marginHorizontal: 10,
    color: "#fff",
  },
  loader: {
    marginRight: 6,
  },
});