import React from "react";
import { Text, TextInput, TextInputProps } from "react-native";
import { authStyles } from "./auth-form-styles";

interface AuthInputProps extends TextInputProps {
  label: string;
  marginTop?: number;
}

/**
 * Input con label para formularios de auth
 */
export function AuthInput({ label, marginTop, ...props }: AuthInputProps) {
  return (
    <>
      <Text style={[authStyles.label, marginTop ? { marginTop } : undefined]}>
        {label}
      </Text>
      <TextInput
        style={authStyles.input}
        placeholderTextColor="#777"
        {...props}
      />
    </>
  );
}