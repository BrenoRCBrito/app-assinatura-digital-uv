import React, { useState } from "react";
import { Alert } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { RootStackParamList } from "./types";
import { useAuth } from "../hooks/useAuth";
import { RegisterScreen } from "../screens/RegisterScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { HomeScreen } from "../screens/HomeScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const {
    isLoading,
    hasAccount,
    biometricsPreference,
    isAuthenticated,
    hasHardware,
    isEnrolled,
    register,
    loginWithPassword,
    loginWithBiometrics,
    enableBiometricsPreference,
    logout,
  } = useAuth();

  const [showRegisterOverride, setShowRegisterOverride] = useState(false);

  if (isLoading) {
    return null;
  }

  const canOfferBiometrics = biometricsPreference && hasHardware && isEnrolled;
  const shouldShowRegister = !hasAccount || showRegisterOverride;

  function handleAfterRegister() {
    setShowRegisterOverride(false);
    Alert.alert(
      "Ativar biometria?",
      "Deseja usar biometria para entrar mais rápido da próxima vez?",
      [
        { text: "Não", style: "cancel" },
        { text: "Sim", onPress: () => enableBiometricsPreference() },
      ],
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {isAuthenticated ? (
          <Stack.Screen name="Home">
            {() => <HomeScreen onLogout={logout} />}
          </Stack.Screen>
        ) : shouldShowRegister ? (
          <Stack.Screen name="Register">
            {() => (
              <RegisterScreen
                onRegister={register}
                onAfterRegister={handleAfterRegister}
                hasExistingAccount={hasAccount}
                onNavigateToLogin={() => setShowRegisterOverride(false)}
              />
            )}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Login">
            {() => (
              <LoginScreen
                onLoginWithPassword={loginWithPassword}
                onLoginWithBiometrics={loginWithBiometrics}
                showBiometricsOption={canOfferBiometrics}
                onNavigateToRegister={() => setShowRegisterOverride(true)}
              />
            )}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
