import React, { useState } from 'react';

import { Button, FieldEditModal, Stack, showError, showErrorWithSettings } from '../../components';
import type { CapturedPhoto } from '../../domain/photo';
import { escolherDocumentoDaGaleria } from '../../services/documentoDaGaleria';

type OrigemDoDocumentoDialogProps = Readonly<{
  visible: boolean;
  onClose: () => void;
  onTirarFoto: () => void;
  onFotoEscolhida: (foto: CapturedPhoto) => void;
}>;

const SEM_PERMISSAO = 'Permita o acesso às fotos para escolher a imagem do documento.';

export function OrigemDoDocumentoDialog({ visible, onClose, onTirarFoto, onFotoEscolhida }: OrigemDoDocumentoDialogProps) {
  const [processando, setProcessando] = useState(false);

  function tirarFoto() {
    onClose();
    onTirarFoto();
  }

  async function escolherDaGaleria() {
    setProcessando(true);
    try {
      const resultado = await escolherDocumentoDaGaleria();
      if (resultado.tipo === 'cancelada') {
        return;
      }
      if (resultado.tipo === 'semPermissao') {
        if (resultado.podePedirDeNovo) {
          showError('Erro', SEM_PERMISSAO);
        } else {
          showErrorWithSettings('Erro', SEM_PERMISSAO);
        }
        return;
      }
      onClose();
      onFotoEscolhida(resultado.foto);
    } catch (error) {
      console.error('Falha ao usar a foto da galeria:', error);
      showError('Erro', 'Não foi possível usar a foto da galeria. Tente outra.');
    } finally {
      setProcessando(false);
    }
  }

  return (
    <FieldEditModal visible={visible} title="Digitalizar documento" onClose={onClose}>
      <Stack gap="label" align="center">
        <Button label="Tirar foto agora" icon="camera" onPress={tirarFoto} disabled={processando} />
        <Button
          label="Escolher da galeria"
          onPress={() => {
            void escolherDaGaleria();
          }}
          preset="secondary"
          disabled={processando}
        />
      </Stack>
    </FieldEditModal>
  );
}
