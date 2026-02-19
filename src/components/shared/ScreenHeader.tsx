import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

/**
 * Props del componente ScreenHeader:
 * - title: Título del header.
 * - onBackPress: Callback custom para el botón back (si no se provee, usa router.back()).
 * - showBack: Mostrar/ocultar botón back (default: true).
 * - rightContent: Contenido opcional a la derecha (acciones/íconos).
 */
interface ScreenHeaderProps {
  title: string;
  onBackPress?: () => void;
  showBack?: boolean;
  rightContent?: React.ReactNode;
}

/**
 * Header estandarizado con back button y título centrado.
 * Usado en todas las pantallas secundarias.
 * 
 * @example
 * <ScreenHeader title="Explorar géneros" />
 * 
 * <ScreenHeader 
 *   title="Artist" 
 *   rightContent={<ShareButton />}
 * />
 */
export default function ScreenHeader({
  title,
  onBackPress,
  showBack = true,
  rightContent,
}: ScreenHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      {showBack ? (
        <TouchableOpacity
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          style={styles.button}
        >
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
      ) : (
        <View style={styles.button} />
      )}

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      {rightContent ? (
        <View style={styles.button}>{rightContent}</View>
      ) : (
        <View style={styles.button} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 4,
    flexShrink: 0,
  },
  button: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
});