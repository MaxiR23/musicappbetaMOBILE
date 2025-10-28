// @/src/components/HomeBanner.tsx
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

export default function HomeBanner() {
  const router = useRouter();

  return (
    <LinearGradient
      colors={["#00f2fe", "#4facfe"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.banner}
    >
      <Text style={styles.title}>Descubre Nueva Música</Text>
      <Text style={styles.subtitle}>
        Explora los últimos lanzamientos y artistas destacados
      </Text>
      <TouchableOpacity 
        style={styles.button}
        onPress={() => router.push('/genres')}
      >
        <Text style={styles.buttonText}>Explorar Ahora</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: 20, padding: 20, marginBottom: 24 },
  title: { fontSize: 20, fontWeight: "bold", color: "#fff", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#eee", marginBottom: 16 },
  button: {
    backgroundColor: "#000",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  buttonText: { color: "#fff", fontWeight: "600" },
});