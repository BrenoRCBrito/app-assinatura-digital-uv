import React, { useEffect, useState } from 'react';

import { Button, FieldEditModal, Icon, Row, Stack, Text, TextField, showError, showSuccess } from '../../components';
import { REQUISITOS_SENHA, type Usuario } from '../../domain/usuario';
import { hashSenha } from '../../services/passwordHash';
import { useRepositories } from '../../storage/RepositoriesProvider';
import { useAppTheme } from '../../theme';

type SenhaDialogProps = Readonly<{
  visible: boolean;
  usuario: Usuario;
  onClose: () => void;
  onSaved: (usuario: Usuario) => void;
}>;

export function SenhaDialog({ visible, usuario, onClose, onSaved }: SenhaDialogProps) {
  const { usuarios } = useRepositories();
  const { theme } = useAppTheme();
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (visible) {
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarNovaSenha('');
    }
  }, [visible]);

  const requisitos = REQUISITOS_SENHA.map((requisito) => ({ ...requisito, atendido: requisito.atendido(novaSenha) }));
  const senhaValida = requisitos.every((requisito) => requisito.atendido);
  const senhasDiferentes = confirmarNovaSenha.length > 0 && novaSenha !== confirmarNovaSenha;
  const podeSalvar = senhaAtual.length > 0 && senhaValida && !senhasDiferentes && !salvando;

  async function salvar() {
    if (!podeSalvar) {
      return;
    }
    setSalvando(true);
    try {
      const senhaHashDigitada = await hashSenha(senhaAtual);
      if (senhaHashDigitada !== usuario.senhaHash) {
        showError('Senha incorreta', 'Confira a senha atual e tente de novo.');
        return;
      }
      const novoHash = await hashSenha(novaSenha);
      const atualizado = await usuarios.updateSenha(usuario.id, novoHash);
      showSuccess('Senha atualizada.');
      onSaved(atualizado);
      onClose();
    } catch (error) {
      console.error('Falha ao atualizar a senha:', error);
      showError('Erro', 'Não foi possível atualizar a senha.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <FieldEditModal visible={visible} title="Editar senha" onClose={onClose}>
      <Stack gap="label">
        <TextField
          label="Senha atual"
          accessibilityLabel="Senha atual"
          value={senhaAtual}
          onChangeText={setSenhaAtual}
          placeholder="Sua senha atual"
          secureTextEntry
        />
        <TextField
          label="Nova senha"
          accessibilityLabel="Nova senha"
          value={novaSenha}
          onChangeText={setNovaSenha}
          placeholder="Crie uma nova senha"
          secureTextEntry
        />
        <TextField
          label="Confirmar nova senha"
          accessibilityLabel="Confirmar nova senha"
          value={confirmarNovaSenha}
          onChangeText={setConfirmarNovaSenha}
          placeholder="Repita a nova senha"
          secureTextEntry
        />
        {senhasDiferentes ? <Text preset="status">As senhas ainda não são iguais.</Text> : null}
        <Stack gap="label">
          {requisitos.map((requisito) => (
            <Row key={requisito.chave} gap="icon" align="center">
              <Icon name="check" size="inline" color={requisito.atendido ? theme.success : theme.textMuted} />
              <Text preset={requisito.atendido ? 'requisitoSenhaAtendido' : 'requisitoSenhaPendente'}>
                {requisito.label}
              </Text>
            </Row>
          ))}
        </Stack>
        <Button label={salvando ? 'Salvando…' : 'Salvar senha'} onPress={salvar} disabled={!podeSalvar} />
      </Stack>
    </FieldEditModal>
  );
}
