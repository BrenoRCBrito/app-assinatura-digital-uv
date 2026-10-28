import React, { useState } from 'react';

import { Avatar, Button, FieldEditModal, Stack, showError, showErrorWithSettings, showSuccess } from '../../components';
import type { Usuario } from '../../domain/usuario';
import { escolherFotoDaGaleria, tirarFotoDePerfil, type ResultadoFotoPerfil } from '../../services/fotoPerfil';
import { useRepositories } from '../../storage/RepositoriesProvider';

type FotoPerfilDialogProps = Readonly<{
  visible: boolean;
  usuario: Usuario;
  onClose: () => void;
  onSaved: (usuario: Usuario) => void;
}>;

const SEM_PERMISSAO = {
  camera: 'Permita o acesso à câmera para tirar a foto.',
  galeria: 'Permita o acesso às fotos para escolher a imagem.',
} as const;

export function FotoPerfilDialog({ visible, usuario, onClose, onSaved }: FotoPerfilDialogProps) {
  const { usuarios } = useRepositories();
  const [processando, setProcessando] = useState(false);

  async function atualizar(origem: keyof typeof SEM_PERMISSAO, obter: () => Promise<ResultadoFotoPerfil>) {
    setProcessando(true);
    try {
      const resultado = await obter();
      if (resultado.tipo === 'cancelada') {
        return;
      }
      if (resultado.tipo === 'semPermissao') {
        if (resultado.podePedirDeNovo) {
          showError('Erro', SEM_PERMISSAO[origem]);
        } else {
          showErrorWithSettings('Erro', SEM_PERMISSAO[origem]);
        }
        return;
      }
      const atualizado = await usuarios.updateFoto(usuario.id, resultado.foto);
      showSuccess('Foto de perfil atualizada.');
      onSaved(atualizado);
      onClose();
    } catch (error) {
      console.error('Falha ao atualizar a foto de perfil:', error);
      showError('Erro', 'Não foi possível atualizar a foto de perfil.');
    } finally {
      setProcessando(false);
    }
  }

  async function remover() {
    setProcessando(true);
    try {
      const atualizado = await usuarios.updateFoto(usuario.id, null);
      showSuccess('Foto de perfil removida.');
      onSaved(atualizado);
      onClose();
    } catch (error) {
      console.error('Falha ao remover a foto de perfil:', error);
      showError('Erro', 'Não foi possível remover a foto de perfil.');
    } finally {
      setProcessando(false);
    }
  }

  return (
    <FieldEditModal visible={visible} title="Foto de perfil" onClose={onClose}>
      <Stack gap="label" align="center">
        <Avatar fotoBase64={usuario.foto} />
        <Button
          label="Tirar foto agora"
          icon="camera"
          onPress={() => {
            void atualizar('camera', tirarFotoDePerfil);
          }}
          disabled={processando}
        />
        <Button
          label="Escolher da galeria"
          onPress={() => {
            void atualizar('galeria', escolherFotoDaGaleria);
          }}
          preset="secondary"
          disabled={processando}
        />
        {usuario.foto === null ? null : (
          <Button label="Remover foto" onPress={remover} preset="danger" size="sm" disabled={processando} />
        )}
      </Stack>
    </FieldEditModal>
  );
}
