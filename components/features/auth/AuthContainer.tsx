import { useState } from "react";
import { Platform, ScrollView, StatusBar, View } from "react-native";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";

// INFO: KeyboardAvoidingView en iOS causa jumping/temblor en cada keystroke porque
// depende de notificaciones de teclado asíncronas (UIKeyboardWillShowNotification)
// que desde iOS 15+ se entregan out-of-process y no son confiables.
// ScrollView con automaticallyAdjustKeyboardInsets usa el Keyboard Layout Guide
// nativo de iOS 15 — tracking sincrónico, sin jumping.
// Android no se toca: el sistema maneja el teclado nativamente.
// SEE: https://reactnative.dev/docs/scrollview#automaticallyadjustkeyboardinsets-ios

export default function AuthContainer() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <View style={{ flex: 1, backgroundColor: "#0e0e0e" }}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        bounces={false}
      >
        {isLogin ? (
          <LoginForm onSwitchToRegister={() => setIsLogin(false)} />
        ) : (
          <RegisterForm onSwitchToLogin={() => setIsLogin(true)} />
        )}
      </ScrollView>
    </View>
  );
}