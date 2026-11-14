import React, { useState } from 'react';
import { Button, FeatureCard, MenuList, Row, Screen, Stack } from '../../components';
import type { CapturedPhoto } from '../../domain/photo';
import { useAuthentication } from '../../hooks/useAuthentication';
import { OrigemDoDocumentoDialog } from './OrigemDoDocumentoDialog';

type HomeScreenProps = Readonly<{
  onDigitalizarDocumento: () => void;
  onUsarFotoDaGaleria: (foto: CapturedPhoto) => void;
  onOpenAssinaturas: () => void;
  onOpenHistorico: () => void;
  onValidarDocumento: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
}>;

export function HomeScreen({
  onDigitalizarDocumento,
  onUsarFotoDaGaleria,
  onOpenAssinaturas,
  onOpenHistorico,
  onValidarDocumento,
  onOpenProfile,
  onOpenSettings,
}: HomeScreenProps) {

const { sair } = useAuthentication();
const [escolhendoOrigem, setEscolhendoOrigem] = useState(false);

return (
    <Screen
      preset="menu"
      footer={
        <Row justify="center">
          <Button
            label="Sair da conta"
            icon="logout"
            onPress={() => {
              void sair();
            }}
            preset="danger"
            size="sm"
          />
        </Row>
      }
    >
      <Stack gap="block">
        <FeatureCard
          icon="documentSign"
          title="Assinar documento"
          description="Fotografe o documento ou escolha a foto na galeria, posicione uma assinatura salva e gere o PDF."
        >
          <Button
            label="Digitalizar documento"
            icon="camera"
            onPress={() => setEscolhendoOrigem(true)}
            preset="inverse"
          />
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
      <OrigemDoDocumentoDialog
        visible={escolhendoOrigem}
        onClose={() => setEscolhendoOrigem(false)}
        onTirarFoto={onDigitalizarDocumento}
        onFotoEscolhida={onUsarFotoDaGaleria}
      />
    </Screen>
  );
}
