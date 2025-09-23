import { useAuth } from "@/src/hooks/use-auth"; // luego lo implementás
import { useRouter } from "expo-router";
import { Music } from "lucide-react-native";
import { useState } from "react";
import {
    ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet,
    Text, TextInput, TouchableOpacity,
    View
} from "react-native";

type Props = { onSwitchToRegister: () => void };

export default function LoginForm({ onSwitchToRegister }: Props) {
  const router = useRouter();
  const { signIn, loading } = useAuth(); // <- interfaz esperada
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!email || !password) return;
    setError(null);
    try {
      await signIn({ email, password });
      router.replace("/"); // a home
    } catch (e: any) {
      setError(e?.message ?? "Error al iniciar sesión");
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <View style={s.wrap}>
        {/* Brand */}
        <View style={s.brandBox}>
          <View style={s.brandIcon}>
            <Music size={28} color="#000" />
          </View>
          <Text style={s.brandTitle}>MusicApp</Text>
          <Text style={s.brandSubtitle}>Inicia sesión para acceder a tu música</Text>
        </View>

        {/* Card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Iniciar Sesión</Text>
          <Text style={s.cardDesc}>Ingresa tus credenciales para continuar</Text>

          <View style={{ marginTop: 16 }}>
            <Text style={s.label}>Email</Text>
            <TextInput
              style={s.input}
              placeholder="tu@email.com"
              placeholderTextColor="#777"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={[s.label, { marginTop: 12 }]}>Contraseña</Text>
            <TextInput
              style={s.input}
              placeholder="••••••••"
              placeholderTextColor="#777"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {!!error && <Text style={s.error}>{error}</Text>}

            <TouchableOpacity
              onPress={onSubmit}
              disabled={loading}
              style={[s.btn, loading && { opacity: 0.7 }]}
            >
              {loading ? (
                <ActivityIndicator />
              ) : (
                <Text style={s.btnText}>Iniciar Sesión</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={s.switchText}>
            ¿No tienes una cuenta?{" "}
            <Text onPress={onSwitchToRegister} style={s.switchLink}>Regístrate aquí</Text>
          </Text>
        </View>

        <Text style={s.footer}>© 2024 MusicApp. Todos los derechos reservados.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const ACCENT = "#ffffff";
const ACCENT_TEXT = "#000";

const s = StyleSheet.create({
  wrap: { flex: 1, padding: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#0e0e0e" },
  brandBox: { alignItems: "center", marginBottom: 18 },
  brandIcon: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: ACCENT, alignItems: "center", justifyContent: "center", marginBottom: 10
  },
  brandTitle: {
    fontSize: 28, fontWeight: "800",
    color: ACCENT, letterSpacing: 0.4
  },
  brandSubtitle: { color: "#aaa", marginTop: 6 },

  card: {
    width: "100%", maxWidth: 460,
    backgroundColor: "#141414", borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "#222"
  },
  cardTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },
  cardDesc: { color: "#aaa", marginTop: 2 },

  label: { color: "#ddd", fontSize: 12, marginBottom: 6 },
  input: {
    height: 46, borderRadius: 10, paddingHorizontal: 12,
    backgroundColor: "#1b1b1b", color: "#fff", borderWidth: 1, borderColor: "#2a2a2a"
  },
  error: { color: "#ff5c5c", marginTop: 10 },

  btn: {
    marginTop: 16, height: 46, borderRadius: 10,
    backgroundColor: ACCENT, alignItems: "center", justifyContent: "center"
  },
  btnText: { color: ACCENT_TEXT, fontWeight: "700" },

  switchText: { color: "#aaa", textAlign: "center", marginTop: 14 },
  switchLink: { color: ACCENT, fontWeight: "700" },

  footer: { color: "#666", fontSize: 12, marginTop: 16 }
});