import React, { useEffect, useState } from 'react';

import { Button, FieldEditModal, Stack, TextField, showError, showSuccess } from '../../components';
import { ValidationError } from '../../domain/brand';
import { criarEmail, type Usuario } from '../../domain/usuario';
import { hashSenha } from '../../services/passwordHash';
import { useRepositories } from '../../storage/RepositoriesProvider';

type EmailDialogProps = Readonly<{
  visible: boolean;
  usuario: Usuario;
  onClose: () => void;
  onSaved: (usuario: Usuario) => void;
}>;

export function EmailDialog({ visible, usuario, onClose, onSaved }: EmailDialogProps) {
  const { usuarios } = useRepositories();
  const [email, setEmail] = useState<string>(usuario.email);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (visible) {
      setEmail(usuario.email);
      setSenhaAtual('');
    }
  }, [visible, usuario.email]);

  async function salvar() {
    setSalvando(true);
    try {
      const emailValido = criarEmail(email);
      const senhaHashDigitada = await hashSenha(senhaAtual);
      if (senhaHashDigitada !== usuario.senhaHash) {
        showError('Senha incorreta', 'Confira a senha atual e tente de novo.');
        return;
      }
      if (emailValido !== usuario.email) {
        const existente = await usuarios.findByEmail(emailValido);
        if (existente !== null && existente.id !== usuario.id) {
          showError('E-mail em uso', 'Este e-mail já pertence a outra conta.');
          return;
        }
      }
      const atualizado = await usuarios.updateEmail(usuario.id, emailValido);
      showSuccess('E-mail atualizado.');
      onSaved(atualizado);
      onClose();
    } catch (error) {
      if (error instanceof ValidationError) {
        showError('Confira o e-mail', error.message);
      } else {
        console.error('Falha ao atualizar o e-mail:', error);
        showError('Erro', 'Não foi possível atualizar o e-mail.');
      }
    } finally {
      setSalvando(false);
    }
  }

  return (
    <FieldEditModal visible={visible} title="Editar e-mail" onClose={onClose}>
      <Stack gap="label">
        <TextField
          label="E-mail"
          accessibilityLabel="E-mail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextField
          label="Senha atual"
          accessibilityLabel="Senha atual para confirmar o e-mail"
          value={senhaAtual}
          onChangeText={setSenhaAtual}
          placeholder="Confirme com sua senha"
          secureTextEntry
        />
        <Button
          label={salvando ? 'Salvando…' : 'Salvar e-mail'}
          onPress={salvar}
          disabled={salvando || senhaAtual.length === 0}
        />
      </Stack>
    </FieldEditModal>
  );
}
