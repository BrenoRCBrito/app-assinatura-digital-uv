import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';

import { PrimaryButton } from '../../components/PrimaryButton';
import { darkTheme } from '../../theme/appTheme';
import { styles } from './styles';

type LoginScreenProps = Readonly<{
  hasHardware: boolean;
  onLogin: () => void;
}>;

export function LoginScreen({ hasHardware, onLogin }: LoginScreenProps) {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.title}>Bem Vindo Assine Aqui</Text>
      <Text style={styles.subtitle}>
        {hasHardware ? 'Toque abaixo para entrar com biometria' : 'Seu dispositivo não possui suporte a biometria'}
      </Text>
      <PrimaryButton label="Entrar com Biometria" onPress={onLogin} theme={darkTheme} disabled={!hasHardware} />
    </View>
  );
}
