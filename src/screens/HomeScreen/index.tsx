import React from 'react';

import { Button, FeatureCard, MenuList, Row, Screen, Stack } from '../../components';
import { useAuthentication } from '../../hooks/useAuthentication';

type HomeScreenProps = Readonly<{
  onDigitalizarDocumento: () => void;
  onOpenAssinaturas: () => void;
  onOpenHistorico: () => void;
  onValidarDocumento: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
}>;

export function HomeScreen({
  onDigitalizarDocumento,
  onOpenAssinaturas,
  onOpenHistorico,
  onValidarDocumento,
  onOpenProfile,
  onOpenSettings,
}: HomeScreenProps) {
  const { lock } = useAuthentication();

  return (
    <Screen
      preset="menu"
      footer={
        <Row justify="center">
          <Button label="Sair" icon="logout" onPress={lock} preset="danger" size="sm" />
        </Row>
      }
    >
      <Stack gap="block">
        <FeatureCard
          icon="documentSign"
          title="Assinar documento"
          description="Fotografe o documento, posicione uma assinatura salva e gere o PDF."
        >
          <Button label="Digitalizar documento" icon="camera" onPress={onDigitalizarDocumento} preset="inverse" />
        </FeatureCard>
        <MenuList
          items={[
            { label: 'Minhas assinaturas', icon: 'signatures', onPress: onOpenAssinaturas },
            { label: 'Histórico', icon: 'history', onPress: onOpenHistorico },
            { label: 'Validar documento', icon: 'shieldCheck', onPress: onValidarDocumento },
            { label: 'Perfil', icon: 'profile', onPress: onOpenProfile },
            { label: 'Configurações', icon: 'settings', onPress: onOpenSettings },
          ]}
        />
      </Stack>
    </Screen>
  );
}
