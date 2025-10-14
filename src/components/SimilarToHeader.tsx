import { Ionicons } from "@expo/vector-icons";
import React, { memo } from "react";
import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

type Props = {
  label?: string;                 // texto arriba (default: "More like")
  name?: string | null;           // nombre del seed
  thumb?: string | null;          // url del seed
  size?: number;                  // tamaño del avatar (default: 48)
  style?: StyleProp<ViewStyle>;   // estilos extra para el contenedor
};

function _SimilarToHeader({
  label = "More like",
  name = "Artista",
  thumb,
  size = 48,
  style,
}: Props) {
  const radius = size / 2;

  return (
    <View style={[styles.row, style]}>
      {thumb ? (
        <Image source={{ uri: thumb }} style={{ width: size, height: size, borderRadius: radius }} />
      ) : (
        <View style={[styles.fallback, { width: size, height: size, borderRadius: radius }]}>
          <Ionicons name="person-outline" size={Math.max(18, size * 0.45)} color="#777" />
        </View>
      )}
      <View style={{ flexShrink: 1 }}>
        <Text style={styles.label}>{label}</Text>
        <Text numberOfLines={1} style={styles.name}>{name}</Text>
      </View>
    </View>
  );
}

export default memo(_SimilarToHeader);

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  fallback: { backgroundColor: "#222", alignItems: "center", justifyContent: "center" },
  label: { color: "#aaa", fontSize: 13, fontWeight: "600" },
  name: { color: "#fff", fontSize: 18, fontWeight: "700" },
});