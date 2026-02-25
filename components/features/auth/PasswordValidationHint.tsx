import { Check } from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";
import { authStyles } from "./auth-form-styles";

interface PasswordValidationHintProps {
  isValid: boolean;
  text: string;
  errorColor?: string;
}

/**
 * Hint de validación con icono de check o dot
 */
export function PasswordValidationHint({
  isValid,
  text,
  errorColor = "#ff5c5c",
}: PasswordValidationHintProps) {
  return (
    <View style={authStyles.hintRow}>
      {isValid ? (
        <Check size={12} color="#fff" />
      ) : (
        <View style={[authStyles.dot, { borderColor: errorColor }]} />
      )}
      <Text style={[authStyles.hintText, { color: isValid ? "#fff" : errorColor }]}>
        {text}
      </Text>
    </View>
  );
}