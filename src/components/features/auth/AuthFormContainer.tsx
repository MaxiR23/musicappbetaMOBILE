import React from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Text,
  View,
} from "react-native";
import { authStyles } from "./auth-form-styles";

interface AuthFormContainerProps {
  title: string;
  description: string;
  subtitle: string;
  children: React.ReactNode;
  switchText: string;
  switchLinkText: string;
  onSwitchPress: () => void;
}

/**
 * Container compartido para formularios de autenticación (Login/Register)
 * Incluye: brand, card wrapper, switch footer
 */
export function AuthFormContainer({
  title,
  description,
  subtitle,
  children,
  switchText,
  switchLinkText,
  onSwitchPress,
}: AuthFormContainerProps) {
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <View style={authStyles.wrap}>
        {/* Brand */}
        <View style={authStyles.brandBox}>
          <View style={authStyles.brandIcon}>
            <Image
              source={require('@/assets/images/icon.png')}
              style={{ width: 80, height: 80 }}
              resizeMode="contain"
            />
          </View>
          <Text style={authStyles.brandTitle}>Beatly</Text>
          <Text style={authStyles.brandSubtitle}>{subtitle}</Text>
        </View>

        {/* Card */}
        <View style={authStyles.card}>
          <Text style={authStyles.cardTitle}>{title}</Text>
          <Text style={authStyles.cardDesc}>{description}</Text>

          <View style={{ marginTop: 16 }}>{children}</View>

          <Text style={authStyles.switchText}>
            {switchText}{" "}
            <Text onPress={onSwitchPress} style={authStyles.switchLink}>
              {switchLinkText}
            </Text>
          </Text>
        </View>

        <Text style={authStyles.footer}>
          © 2025 MusicApp. Todos los derechos reservados.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}