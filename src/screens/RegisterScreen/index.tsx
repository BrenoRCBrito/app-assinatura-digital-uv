import React, { useState } from "react";
import { View, Text, Alert } from "react-native";
import { styles } from "./styles";
import { PrimaryButton } from "../../components/PrimaryButton";
import { TextField } from "../../components/TextField";
import { KeyboardDismissView } from "../../components/KeyboardDismissView";

interface RegisterScreenProps {
  onRegister: (name: string, email: string, password: string) => Promise<void>;
  onAfterRegister: () => void;
  hasExistingAccount: boolean;
  onNavigateToLogin: () => void;
}

export function RegisterScreen({
  onRegister,
  onAfterRegister,
  hasExistingAccount,
  onNavigateToLogin,
}: RegisterScreenProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function submitRegistration() {
    await onRegister(name, email, password);
    onAfterRegister();
  }

  async function handleSubmit() {
    if (!name || !email || !password) {
      Alert.alert("Preencha todos os campos");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("As senhas não coincidem");
      return;
    }

    if (hasExistingAccount) {
      Alert.alert(
        "Substituir conta?",
        "Já existe uma conta cadastrada neste aparelho. Continuar vai substituir essa conta pela nova.",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Substituir",
            style: "destructive",
            onPress: submitRegistration,
          },
        ],
      );
      return;
    }

    await submitRegistration();
  }

  return (
    <KeyboardDismissView style={styles.container}>
      <Text style={styles.title}>Criar conta</Text>

      <TextField placeholder="Nome" value={name} onChangeText={setName} />
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
      <TextField
        placeholder="Confirmar senha"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />

      <PrimaryButton label="Cadastrar" onPress={handleSubmit} />

      {hasExistingAccount && (
        <View style={styles.spacedButtonWrapper}>
          <PrimaryButton label="Já tenho conta" onPress={onNavigateToLogin} />
        </View>
      )}
    </KeyboardDismissView>
  );
}
