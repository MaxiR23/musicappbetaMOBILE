import { useAuth } from "@/hooks/use-auth";
import { useMemo, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity } from "react-native";
import { authStyles } from "./auth-form-styles";
import { AuthFormContainer } from "./AuthFormContainer";
import { AuthInput } from "./AuthInput";
import { PasswordValidationHint } from "./PasswordValidationHint";

type Props = { onSwitchToLogin: () => void };

export default function RegisterForm({ onSwitchToLogin }: Props) {
  const { signUp, loading } = useAuth();
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const passwordMatch = useMemo(
    () => !!password && password === confirm,
    [password, confirm]
  );
  const longEnough = password.length >= 6;

  const onSubmit = async () => {
    if (!passwordMatch || !longEnough) return;
    setError(null);
    try {
      await signUp({ email, password, metadata: { display_name: name } });
    } catch (e: any) {
      setError(e?.message ?? "Error al registrarse");
    }
  };

  return (
    <AuthFormContainer
      title="Crear Cuenta"
      description="Completa los datos para registrarte"
      subtitle="Únete a la mejor experiencia musical"
      switchText="¿Ya tienes una cuenta?"
      switchLinkText="Inicia sesión aquí"
      onSwitchPress={onSwitchToLogin}
    >
      <AuthInput
        label="Nombre completo"
        placeholder="Tu nombre"
        value={name}
        onChangeText={setName}
      />

      <AuthInput
        label="Display name"
        placeholder="Ej: Maxi23"
        value={displayName}
        onChangeText={setDisplayName}
        marginTop={12}
      />

      <AuthInput
        label="Email"
        placeholder="tu@email.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        marginTop={12}
      />

      <AuthInput
        label="Contraseña"
        placeholder="••••••••"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        marginTop={12}
      />
      {!!password && (
        <PasswordValidationHint
          isValid={longEnough}
          text="Mínimo 6 caracteres"
        />
      )}

      <AuthInput
        label="Confirmar contraseña"
        placeholder="••••••••"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        marginTop={12}
      />
      {!!confirm && (
        <PasswordValidationHint
          isValid={passwordMatch}
          text={
            passwordMatch
              ? "Las contraseñas coinciden"
              : "Las contraseñas no coinciden"
          }
        />
      )}

      {!!error && <Text style={authStyles.error}>{error}</Text>}

      <TouchableOpacity
        onPress={onSubmit}
        disabled={!passwordMatch || !longEnough || loading}
        style={[
          authStyles.btn,
          (!passwordMatch || !longEnough || loading) && { opacity: 0.7 },
        ]}
      >
        {loading ? <ActivityIndicator /> : <Text style={authStyles.btnText}>Crear Cuenta</Text>}
      </TouchableOpacity>
    </AuthFormContainer>
  );
}