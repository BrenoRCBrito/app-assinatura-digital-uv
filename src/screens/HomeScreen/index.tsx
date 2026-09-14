import React from 'react';

import { Button, Screen, Stack, Text } from '../../components';
import { useAuthentication } from '../../hooks/useAuthentication';

type HomeScreenProps = Readonly<{
  onOpenAssinaturas: () => void;
  onOpenSettings: () => void;
}>;

export function HomeScreen({ onOpenAssinaturas, onOpenSettings }: HomeScreenProps) {
  const { lock } = useAuthentication();

  return (
    <Screen preset="centered">
      <Stack gap="heroActions" align="center">
        <Stack gap="titleText" align="center">
          <Text preset="screenTitle">Área Segura</Text>
          <Text preset="subtitle">Usuário logado com sucesso!</Text>
        </Stack>
        <Stack gap="actions" align="center">
          <Button label="Minhas assinaturas" onPress={onOpenAssinaturas} />
          <Button label="Configurações" onPress={onOpenSettings} preset="secondary" />
          <Button label="Sair" onPress={lock} preset="danger" size="sm" />
        </Stack>
      </Stack>
    </Screen>
  );
}
