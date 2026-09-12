import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Image, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuthentication } from '../../hooks/useAuthentication';
import type { BiometricStatus } from '../../services/localAuthentication';
import { darkTheme } from '../../theme/appTheme';
import { styles } from './styles';

const STATUS_TEXT: Readonly<Record<BiometricStatus, string>> = {
  enrolled: 'Use sua biometria ou a senha do aparelho para entrar.',
  notEnrolled: 'Nenhuma biometria cadastrada. Use a senha do aparelho para entrar.',
  noHardware: 'Este aparelho não tem biometria. Use a senha do aparelho para entrar.',
};

export function LoginScreen() {
  const { biometricStatus, authenticating, unlock } = useAuthentication();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.content}>
        <Image
          accessible
          accessibilityLabel="Pena e visto do Assina Aqui"
          source={require('../../../assets/splash-icon.png')}
          style={styles.logo}
        />
        <View style={styles.texts}>
          <Text style={styles.title}>Assina Aqui</Text>
          <Text style={styles.subtitle}>
            {biometricStatus === null ? 'Verificando a biometria do aparelho…' : STATUS_TEXT[biometricStatus]}
          </Text>
        </View>
      </View>
      <View style={styles.footer}>
        <PrimaryButton
          label={authenticating ? 'Autenticando…' : 'Entrar'}
          onPress={unlock}
          theme={darkTheme}
          disabled={authenticating}
        />
      </View>
    </SafeAreaView>
  );
}
