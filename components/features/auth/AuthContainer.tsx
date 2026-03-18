import { useState } from "react";
import { KeyboardAvoidingView, Platform, StatusBar, View } from "react-native";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";

export default function AuthContainer() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <View style={{ flex: 1, backgroundColor: "#0e0e0e" }}>
        <StatusBar barStyle="light-content" />
        {isLogin ? (
          <LoginForm onSwitchToRegister={() => setIsLogin(false)} />
        ) : (
          <RegisterForm onSwitchToLogin={() => setIsLogin(true)} />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}