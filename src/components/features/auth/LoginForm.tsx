import { useAuth } from "@/src/hooks/use-auth";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity } from "react-native";
import { AuthFormContainer } from "./AuthFormContainer";
import { AuthInput } from "./AuthInput";
import { authStyles } from "./auth-form-styles";

type Props = { onSwitchToRegister: () => void };

export default function LoginForm({ onSwitchToRegister }: Props) {
  const router = useRouter();
  const { signIn, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!email || !password) return;
    setError(null);
    try {
      await signIn({ email, password });
      router.replace("/");
    } catch (e: any) {
      setError(e?.message ?? "Error al iniciar sesión");
    }
  };

  return (
    <AuthFormContainer
      title="Iniciar Sesión"
      description="Ingresa tus credenciales para continuar"
      subtitle="Inicia sesión para acceder a tu música"
      switchText="¿No tienes una cuenta?"
      switchLinkText="Regístrate aquí"
      onSwitchPress={onSwitchToRegister}
    >
      <AuthInput
        label="Email"
        placeholder="tu@email.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <AuthInput
        label="Contraseña"
        placeholder="••••••••"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        marginTop={12}
      />

      {!!error && <Text style={authStyles.error}>{error}</Text>}

      <TouchableOpacity
        onPress={onSubmit}
        disabled={loading}
        style={[authStyles.btn, loading && { opacity: 0.7 }]}
      >
        {loading ? <ActivityIndicator /> : <Text style={authStyles.btnText}>Iniciar Sesión</Text>}
      </TouchableOpacity>
    </AuthFormContainer>
  );
}