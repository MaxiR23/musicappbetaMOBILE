import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

export default function HomeBanner() {
  const router = useRouter();

  return (
    <LinearGradient
      colors={["#1e293b", "#0f172a"]} 
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.banner}
    >
      <Text style={styles.title}>Descubre Nueva Música</Text>
      <Text style={styles.subtitle}>
        Explora los últimos lanzamientos y artistas destacados
      </Text>
      <TouchableOpacity 
        activeOpacity={0.7}
        style={styles.button}
        onPress={() => router.push("/(tabs)/explore")}
      >
        <Text style={styles.buttonText}>Explorar Ahora</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  banner: { 
    borderRadius: 24, 
    padding: 24, 
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  title: { 
    fontSize: 24, 
    fontWeight: "700", 
    color: "#fff", 
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: { 
    fontSize: 15, 
    color: "#94a3b8",
    marginBottom: 18,
    lineHeight: 22,
  },
  button: {
    backgroundColor: "#334155", 
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  buttonText: { 
    color: "#f8fafc", 
    fontWeight: "600",
    fontSize: 14,
  },
});