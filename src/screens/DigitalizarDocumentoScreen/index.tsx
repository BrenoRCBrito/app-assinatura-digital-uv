import React, { useRef, useState } from 'react';

import {
  Button,
  DocumentCamera,
  LoadingIndicator,
  PhotoPreview,
  Screen,
  showError,
  showInfo,
  showSuccess,
  Stack,
  Text,
} from '../../components';
import type { CapturedPhoto } from '../../domain/photo';
import { useCameraPermission } from '../../hooks/useCameraPermission';
import { salvarCopiaNaGaleria } from '../../services/mediaLibrary';
import { useSettings } from '../../storage/SettingsProvider';

type DigitalizarDocumentoScreenProps = Readonly<{
  onFechar: () => void;
}>;

export function DigitalizarDocumentoScreen({ onFechar }: DigitalizarDocumentoScreenProps) {
  const permissao = useCameraPermission();
  const { settings } = useSettings();
  const [foto, setFoto] = useState<CapturedPhoto | null>(null);
  const [usandoFoto, setUsandoFoto] = useState(false);
  const usandoFotoRef = useRef(false);

  function avisarFalhaNaFoto(error: unknown) {
    console.error('Falha ao tirar a foto:', error);
    showError('Erro', 'Não foi possível tirar a foto. Tente de novo.');
  }

  async function usarFoto() {
    if (foto === null || usandoFotoRef.current) {
      return;
    }
    usandoFotoRef.current = true;
    setUsandoFoto(true);
    const copiaFalhou = settings.salvarCopiaNaGaleria && !(await salvarCopiaNaGaleria(foto));
    if (copiaFalhou) {
      showInfo('Cópia não salva na galeria');
    } else {
      showSuccess('Documento fotografado');
    }
    onFechar();
  }

  if (permissao.status === 'checking') {
    return (
      <Screen preset="immersive">
        <LoadingIndicator />
      </Screen>
    );
  }

  if (permissao.status !== 'granted') {
    const bloqueada = permissao.status === 'blocked';

    return (
      <Screen
        preset="immersive"
        footer={
          <Stack gap="actions">
            {bloqueada ? (
              <Button label="Abrir configurações" icon="settings" onPress={permissao.openSettings} />
            ) : (
              <Button label="Permitir câmera" icon="camera" onPress={permissao.request} />
            )}
            <Button label="Voltar" onPress={onFechar} preset="secondary" />
          </Stack>
        }
      >
        <Stack gap="titleText" align="center">
          <Text preset="screenTitle">Acesso à câmera</Text>
          <Text preset="status">
            {bloqueada
              ? 'A câmera está bloqueada para o Assina Aqui. Libere o acesso nas configurações do aparelho.'
              : 'O Assina Aqui precisa da câmera para fotografar o documento.'}
          </Text>
        </Stack>
      </Screen>
    );
  }

  return (
    <Screen preset="camera">
      <DocumentCamera onClose={onFechar} onCapture={setFoto} onCaptureError={avisarFalhaNaFoto} />
      <PhotoPreview
        foto={foto}
        saving={usandoFoto}
        onRetake={() => setFoto(null)}
        onUse={() => {
          void usarFoto();
        }}
      />
    </Screen>
  );
}
