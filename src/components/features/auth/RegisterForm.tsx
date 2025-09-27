import { useAuth } from "@/src/hooks/use-auth";
import { Check, Music } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet,
  Text, TextInput, TouchableOpacity,
  View
} from "react-native";

type Props = { onSwitchToLogin: () => void };

export default function RegisterForm({ onSwitchToLogin }: Props) {
  const { signUp, loading } = useAuth(); // <- misma interfaz
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const passwordMatch = useMemo(() => !!password && password === confirm, [password, confirm]);
  const longEnough = password.length >= 6;

  const onSubmit = async () => {
    if (!passwordMatch || !longEnough) return;
    setError(null);
    try {
      await signUp({ email, password, metadata: { display_name: name } });
      // podés redirigir acá si querés
    } catch (e: any) {
      setError(e?.message ?? "Error al registrarse");
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
          <Text style={s.brandSubtitle}>Únete a la mejor experiencia musical</Text>
        </View>

        {/* Card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Crear Cuenta</Text>
          <Text style={s.cardDesc}>Completa los datos para registrarte</Text>

          <View style={{ marginTop: 16 }}>
            <Text style={s.label}>Nombre completo</Text>
            <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Tu nombre" placeholderTextColor="#777" />

            <Text style={[s.label, { marginTop: 12 }]}>Display name</Text>
            <TextInput style={s.input} value={displayName} onChangeText={setDisplayName} placeholder="Ej: Maxi23" placeholderTextColor="#777" />

            <Text style={[s.label, { marginTop: 12 }]}>Email</Text>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder="tu@email.com"
              placeholderTextColor="#777"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={[s.label, { marginTop: 12 }]}>Contraseña</Text>
            <TextInput
              style={s.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#777"
              secureTextEntry
            />
            {!!password && (
              <View style={s.hintRow}>
                {longEnough ? <Check size={12} color="#fff" /> : <View style={s.dot} />}
                <Text style={[s.hintText, { color: longEnough ? "#fff" : "#aaa" }]}>
                  Mínimo 6 caracteres
                </Text>
              </View>
            )}

            <Text style={[s.label, { marginTop: 12 }]}>Confirmar contraseña</Text>
            <TextInput
              style={s.input}
              value={confirm}
              onChangeText={setConfirm}
              placeholder="••••••••"
              placeholderTextColor="#777"
              secureTextEntry
            />
            {!!confirm && (
              <View style={s.hintRow}>
                {passwordMatch ? <Check size={12} color="#fff" /> : <View style={[s.dot, { borderColor: "#ff5c5c" }]} />}
                <Text style={[s.hintText, { color: passwordMatch ? "#fff" : "#ff5c5c" }]}>
                  {passwordMatch ? "Las contraseñas coinciden" : "Las contraseñas no coinciden"}
                </Text>
              </View>
            )}

            {!!error && <Text style={s.error}>{error}</Text>}

            <TouchableOpacity
              onPress={onSubmit}
              disabled={!passwordMatch || !longEnough || loading}
              style={[s.btn, (!passwordMatch || !longEnough || loading) && { opacity: 0.7 }]}
            >
              {loading ? <ActivityIndicator /> : <Text style={s.btnText}>Crear Cuenta</Text>}
            </TouchableOpacity>
          </View>

          <Text style={s.switchText}>
            ¿Ya tienes una cuenta?{" "}
            <Text onPress={onSwitchToLogin} style={s.switchLink}>Inicia sesión aquí</Text>
          </Text>
        </View>

        <Text style={s.footer}>© 2025 MusicApp. Todos los derechos reservados.</Text>
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
  brandTitle: { fontSize: 28, fontWeight: "800", color: ACCENT, letterSpacing: 0.4 },
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
  hintRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  hintText: { fontSize: 12 },
  dot: { width: 10, height: 10, borderRadius: 6, borderWidth: 1, borderColor: "#777" },

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