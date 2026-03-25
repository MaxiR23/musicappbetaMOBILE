import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Text, TouchableOpacity } from "react-native";
import { AuthFormContainer } from "./AuthFormContainer";
import { AuthInput } from "./AuthInput";
import { authStyles } from "./auth-form-styles";

type Props = { onSwitchToRegister: () => void };

export default function LoginForm({ onSwitchToRegister }: Props) {
  const { t } = useTranslation("auth");
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
      setError(e?.message ?? t("login.errorFallback"));
    }
  };

  return (
    <AuthFormContainer
      title={t("login.title")}
      description={t("login.description")}
      subtitle={t("login.subtitle")}
      switchText={t("login.switchText")}
      switchLinkText={t("login.switchLink")}
      onSwitchPress={onSwitchToRegister}
    >
      <AuthInput
        label={t("fields.email")}
        placeholder={t("fields.emailPlaceholder")}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        textContentType="emailAddress"
      />

      <AuthInput
        label={t("fields.password")}
        placeholder={t("fields.passwordPlaceholder")}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        textContentType="password"
        marginTop={12}
      />

      {!!error && <Text style={authStyles.error}>{error}</Text>}

      <TouchableOpacity
        onPress={onSubmit}
        disabled={loading}
        style={[authStyles.btn, loading && { opacity: 0.7 }]}
      >
        {loading ? <ActivityIndicator /> : <Text style={authStyles.btnText}>{t("login.submit")}</Text>}
      </TouchableOpacity>
    </AuthFormContainer>
  );
}