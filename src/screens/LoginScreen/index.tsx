import React from 'react';

import { Button, Logo, Screen, Stack, Text } from '../../components';
import { useAuthentication } from '../../hooks/useAuthentication';
import type { BiometricStatus } from '../../services/localAuthentication';

const STATUS_TEXT: Readonly<Record<BiometricStatus, string>> = {
  enrolled: 'Use sua biometria ou a senha do aparelho para entrar.',
  notEnrolled: 'Nenhuma biometria cadastrada. Use a senha do aparelho para entrar.',
  noHardware: 'Este aparelho não tem biometria. Use a senha do aparelho para entrar.',
};

export function LoginScreen() {
  const { biometricStatus, authenticating, unlock } = useAuthentication();

  return (
    <Screen
      preset="immersive"
      footer={
        <Button
          label={authenticating ? 'Autenticando…' : 'Entrar'}
          icon="fingerprint"
          onPress={unlock}
          disabled={authenticating}
        />
      }
    >
      <Stack gap="hero" align="center">
        <Logo />
        <Stack gap="titleText" align="center">
          <Text preset="brand">Assina Aqui</Text>
          <Text preset="status">
            {biometricStatus === null ? 'Verificando a biometria do aparelho…' : STATUS_TEXT[biometricStatus]}
          </Text>
        </Stack>
      </Stack>
    </Screen>
  );
}
