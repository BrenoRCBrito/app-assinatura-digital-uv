import React, { useState } from 'react';

import { Avatar, Button, FieldEditModal, Stack, showError, showSuccess } from '../../components';
import type { Usuario } from '../../domain/usuario';
import { escolherFotoDePerfil } from '../../services/fotoPerfil';
import { useRepositories } from '../../storage/RepositoriesProvider';

type FotoPerfilDialogProps = Readonly<{
  visible: boolean;
  usuario: Usuario;
  onClose: () => void;
  onSaved: (usuario: Usuario) => void;
}>;

export function FotoPerfilDialog({ visible, usuario, onClose, onSaved }: FotoPerfilDialogProps) {
  const { usuarios } = useRepositories();
  const [processando, setProcessando] = useState(false);

  async function escolher() {
    setProcessando(true);
    try {
      const foto = await escolherFotoDePerfil();
      if (foto === null) {
        return;
      }
      const atualizado = await usuarios.updateFoto(usuario.id, foto);
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
        <Button label={processando ? 'Escolhendo…' : 'Escolher da galeria'} onPress={escolher} disabled={processando} />
        {usuario.foto === null ? null : (
          <Button label="Remover foto" onPress={remover} preset="secondary" disabled={processando} />
        )}
      </Stack>
    </FieldEditModal>
  );
}
