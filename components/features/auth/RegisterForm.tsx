import { useAuth } from "@/hooks/use-auth";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Text, TouchableOpacity } from "react-native";
import { authStyles } from "./auth-form-styles";
import { AuthFormContainer } from "./AuthFormContainer";
import { AuthInput } from "./AuthInput";
import { PasswordValidationHint } from "./PasswordValidationHint";

type Props = { onSwitchToLogin: () => void };

export default function RegisterForm({ onSwitchToLogin }: Props) {
  const { t } = useTranslation("auth");
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
      setError(e?.message ?? t("register.errorFallback"));
    }
  };

  return (
    <AuthFormContainer
      title={t("register.title")}
      description={t("register.description")}
      subtitle={t("register.subtitle")}
      switchText={t("register.switchText")}
      switchLinkText={t("register.switchLink")}
      onSwitchPress={onSwitchToLogin}
    >
      <AuthInput
        label={t("fields.fullName")}
        placeholder={t("fields.fullNamePlaceholder")}
        value={name}
        onChangeText={setName}
      />

      <AuthInput
        label={t("fields.displayName")}
        placeholder={t("fields.displayNamePlaceholder")}
        value={displayName}
        onChangeText={setDisplayName}
        marginTop={12}
      />

      <AuthInput
        label={t("fields.email")}
        placeholder={t("fields.emailPlaceholder")}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        marginTop={12}
      />

      <AuthInput
        label={t("fields.password")}
        placeholder={t("fields.passwordPlaceholder")}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        marginTop={12}
      />
      {!!password && (
        <PasswordValidationHint
          isValid={longEnough}
          text={t("validation.minChars")}
        />
      )}

      <AuthInput
        label={t("fields.confirmPassword")}
        placeholder={t("fields.passwordPlaceholder")}
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
              ? t("validation.passwordsMatch")
              : t("validation.passwordsNoMatch")
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
        {loading ? <ActivityIndicator /> : <Text style={authStyles.btnText}>{t("register.submit")}</Text>}
      </TouchableOpacity>
    </AuthFormContainer>
  );
}