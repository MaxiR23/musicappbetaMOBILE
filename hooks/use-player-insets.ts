// INFO: Devuelve padding vertical adaptado por plataforma.
// iOS: usa insets reales del dispositivo (Dynamic Island, notch, home indicator).
// Android: valores fijos — el layout ya funciona perfecto sin ajuste.
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function usePlayerInsets() {
  const insets = useSafeAreaInsets();
  return {
    paddingTop: Platform.OS === "ios" ? insets.top : 40,
    paddingBottom: Platform.OS === "ios" ? insets.bottom + 8 : 16,
  };
}