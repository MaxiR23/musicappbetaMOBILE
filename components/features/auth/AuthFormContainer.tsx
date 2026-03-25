import BRAND_ICON from '@/assets/images/icon.png';
import React from "react";
import { useTranslation } from "react-i18next";
import {
  Image,
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

export function AuthFormContainer({
  title,
  description,
  subtitle,
  children,
  switchText,
  switchLinkText,
  onSwitchPress,
}: AuthFormContainerProps) {
  const { t } = useTranslation("auth");

  return (
    <View style={{ flex: 1 }}>
      <View style={authStyles.wrap}>
        {/* Brand */}
        <View style={authStyles.brandBox}>
          <View style={authStyles.brandIcon}>
            <Image
              source={BRAND_ICON}
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
          {t("footer")}
        </Text>
      </View>
    </View>
  );
}