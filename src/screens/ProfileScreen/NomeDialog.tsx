import React, { useEffect, useState } from 'react';

import { Button, FieldEditModal, Stack, TextField, showError, showSuccess } from '../../components';
import { ValidationError } from '../../domain/brand';
import { criarNome, type Usuario } from '../../domain/usuario';
import { useRepositories } from '../../storage/RepositoriesProvider';

type NomeDialogProps = Readonly<{
  visible: boolean;
  usuario: Usuario;
  onClose: () => void;
  onSaved: (usuario: Usuario) => void;
}>;

export function NomeDialog({ visible, usuario, onClose, onSaved }: NomeDialogProps) {
  const { usuarios } = useRepositories();
  const [nome, setNome] = useState<string>(usuario.nome ?? '');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (visible) {
      setNome(usuario.nome ?? '');
    }
  }, [visible, usuario.nome]);

  async function salvar() {
    setSalvando(true);
    try {
      const nomeValido = criarNome(nome);
      const atualizado = await usuarios.updateNome(usuario.id, nomeValido);
      showSuccess('Nome atualizado.');
      onSaved(atualizado);
      onClose();
    } catch (error) {
      if (error instanceof ValidationError) {
        showError('Confira o nome', error.message);
      } else {
        console.error('Falha ao atualizar o nome:', error);
        showError('Erro', 'Não foi possível atualizar o nome.');
      }
    } finally {
      setSalvando(false);
    }
  }

  return (
    <FieldEditModal visible={visible} title="Editar nome" onClose={onClose}>
      <Stack gap="label">
        <TextField
          label="Nome"
          accessibilityLabel="Nome"
          value={nome}
          onChangeText={setNome}
          placeholder="Seu nome completo"
        />
        <Button label={salvando ? 'Salvando…' : 'Salvar nome'} onPress={salvar} disabled={salvando} />
      </Stack>
    </FieldEditModal>
  );
}

