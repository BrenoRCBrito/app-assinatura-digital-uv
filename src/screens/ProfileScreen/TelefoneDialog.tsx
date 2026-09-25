import React, { useEffect, useState } from 'react';

import { Button, FieldEditModal, Stack, TextField, showError, showSuccess } from '../../components';
import { ValidationError } from '../../domain/brand';
import { criarTelefone, type Usuario } from '../../domain/usuario';
import { useRepositories } from '../../storage/RepositoriesProvider';

type TelefoneDialogProps = Readonly<{
  visible: boolean;
  usuario: Usuario;
  onClose: () => void;
  onSaved: (usuario: Usuario) => void;
}>;

export function TelefoneDialog({ visible, usuario, onClose, onSaved }: TelefoneDialogProps) {
  const { usuarios } = useRepositories();
  const [telefone, setTelefone] = useState<string>(usuario.telefone ?? '');
  const [salvando, setSalvando] = useState(false);
   
  useEffect(() => {
    if (visible) {
      setTelefone(usuario.telefone ?? '');
    }
  }, [visible, usuario.telefone]);

  async function salvar() {
    setSalvando(true);
    try {
      const telefoneValido = criarTelefone(telefone);
      const atualizado = await usuarios.updateTelefone(usuario.id, telefoneValido);
      showSuccess('Telefone atualizado.');
      onSaved(atualizado);
      onClose();
    } catch (error) {
      if (error instanceof ValidationError) {
        showError('Confira o telefone', error.message);
      } else {
        console.error('Falha ao atualizar o telefone:', error);
        showError('Erro', 'Não foi possível atualizar o telefone.');
      }
    } finally {
      setSalvando(false);
    }
  }

  return (
    <FieldEditModal visible={visible} title="Editar telefone" onClose={onClose}>
      <Stack gap="label">
        <TextField
          label="Telefone"
          accessibilityLabel="Telefone"
          value={telefone}
          onChangeText={setTelefone}
          placeholder="(00) 00000-0000"
          keyboardType="phone-pad"
        />
        <Button label={salvando ? 'Salvando…' : 'Salvar telefone'} onPress={salvar} disabled={salvando} />
      </Stack>
    </FieldEditModal>
  );
}
