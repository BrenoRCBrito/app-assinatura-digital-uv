import React, { useEffect, useState } from 'react';

import { Button, FieldEditModal, Stack, TextField, showError, showSuccess } from '../../components';
import { ValidationError } from '../../domain/brand';
import { criarCpf, type Usuario } from '../../domain/usuario';
import { useRepositories } from '../../storage/RepositoriesProvider';

type CpfDialogProps = Readonly<{
  visible: boolean;
  usuario: Usuario;
  onClose: () => void;
  onSaved: (usuario: Usuario) => void;
}>;

export function CpfDialog({ visible, usuario, onClose, onSaved }: CpfDialogProps) {
  const { usuarios } = useRepositories();
  const [cpf, setCpf] = useState<string>(usuario.cpf ?? '');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (visible) {
      setCpf(usuario.cpf ?? '');
    }
  }, [visible, usuario.cpf]);

  async function salvar() {
    setSalvando(true);
    try {
      const cpfValido = criarCpf(cpf);
      const atualizado = await usuarios.updateCpf(usuario.id, cpfValido);
      showSuccess('CPF atualizado.');
      onSaved(atualizado);
      onClose();
    } catch (error) {
      if (error instanceof ValidationError) {
        showError('Confira o CPF', error.message);
      } else {
        console.error('Falha ao atualizar o CPF:', error);
        showError('Erro', 'Não foi possível atualizar o CPF.');
      }
    } finally {
      setSalvando(false);
    }
  }

  return (
    <FieldEditModal visible={visible} title="Editar CPF" onClose={onClose}>
      <Stack gap="label">
        <TextField
          label="CPF"
          accessibilityLabel="CPF"
          value={cpf}
          onChangeText={setCpf}
          placeholder="000.000.000-00"
          keyboardType="number-pad"
        />
        <Button label={salvando ? 'Salvando…' : 'Salvar CPF'} onPress={salvar} disabled={salvando} />
      </Stack>
    </FieldEditModal>
  );
}
