import React, { useState } from "react";
import { View, Text, Alert } from "react-native";
import { styles } from "./styles";
import { PrimaryButton } from "../../components/PrimaryButton";
import { TextField } from "../../components/TextField";
import { KeyboardDismissView } from "../../components/KeyboardDismissView";

interface LoginScreenProps {
  onLoginWithPassword: (email: string, password: string) => Promise<boolean>;
  onLoginWithBiometrics: () => Promise<boolean>;
  showBiometricsOption: boolean;
  onNavigateToRegister: () => void;
}

export function LoginScreen({
  onLoginWithPassword,
  onLoginWithBiometrics,
  showBiometricsOption,
  onNavigateToRegister,
}: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handlePasswordLogin() {
    const success = await onLoginWithPassword(email, password);
    if (!success) {
      Alert.alert("Email ou senha incorretos");
    }
  }

  return (
    <KeyboardDismissView style={styles.container}>
      <Text style={styles.title}>Bem Vindo</Text>

      <TextField
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextField
        placeholder="Senha"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <PrimaryButton label="Entrar" onPress={handlePasswordLogin} />

      {showBiometricsOption && (
        <View style={styles.spacedButtonWrapper}>
          <PrimaryButton
            label="Entrar com Biometria"
            onPress={onLoginWithBiometrics}
          />
        </View>
      )}

      <View style={styles.spacedButtonWrapper}>
        <PrimaryButton
          label="Criar nova conta"
          onPress={onNavigateToRegister}
        />
      </View>
    </KeyboardDismissView>
  );
}
