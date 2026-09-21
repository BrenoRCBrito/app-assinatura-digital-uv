import React, { useState } from 'react';

import {
  Button,
  FormColumn,
  Icon,
  KeyboardDismissArea,
  Link,
  Row,
  Screen,
  Stack,
  Text,
  TextField,
  showError,
  showSuccess,
} from '../../components';
import { ValidationError } from '../../domain/brand';
import { criarEmail, REQUISITOS_SENHA } from '../../domain/usuario';
import { hashSenha } from '../../services/passwordHash';
import { useRepositories } from '../../storage/RepositoriesProvider';
import { useAppTheme } from '../../theme';

type CriarContaScreenProps = Readonly<{
  onContaCriada: () => void;
  onJaTenhoConta: () => void;
}>;

export function CriarContaScreen({ onContaCriada, onJaTenhoConta }: CriarContaScreenProps) {
  const { usuarios } = useRepositories();
  const { theme } = useAppTheme();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const requisitos = REQUISITOS_SENHA.map((requisito) => ({ ...requisito, atendido: requisito.atendido(senha) }));
  const senhaValida = requisitos.every((requisito) => requisito.atendido);
  const mostrarSenhasDiferentes = confirmarSenha.length > 0 && senha !== confirmarSenha;
  const podeCriarConta = senhaValida && senha === confirmarSenha && email.trim().length > 0 && !criando;

  async function criarConta() {
    if (!podeCriarConta) {
      return;
    }
    setErro(null);
    setCriando(true);
    try {
      const emailValido = criarEmail(email);
      const existente = await usuarios.findByEmail(emailValido);
      if (existente !== null) {
        setErro('Este e-mail já tem uma conta.');
        return;
      }
      const senhaHash = await hashSenha(senha);
      await usuarios.create({ email: emailValido, senhaHash });
      showSuccess('Conta criada! Faça login.');
      onContaCriada();
    } catch (error) {
      if (error instanceof ValidationError) {
        setErro(error.message);
      } else {
        console.error('Falha ao criar conta:', error);
        showError('Erro', 'Não foi possível criar a conta.');
      }
    } finally {
      setCriando(false);
    }
  }

  return (
    <KeyboardDismissArea>
      <Screen preset="scroll">
        <FormColumn>
          <Stack gap="block">
            <Text preset="screenTitle">Criar conta</Text>

            <Stack gap="label">
              <TextField
                label="E-mail"
                accessibilityLabel="E-mail"
                value={email}
                onChangeText={setEmail}
                placeholder="voce@exemplo.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextField
                label="Senha"
                accessibilityLabel="Senha"
                value={senha}
                onChangeText={setSenha}
                placeholder="Crie uma senha"
                secureTextEntry
              />
              <TextField
                label="Confirmar senha"
                accessibilityLabel="Confirmar senha"
                value={confirmarSenha}
                onChangeText={setConfirmarSenha}
                placeholder="Repita a senha"
                secureTextEntry
              />
              {mostrarSenhasDiferentes ? <Text preset="status">As senhas ainda não são iguais.</Text> : null}
            </Stack>

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

            {erro === null ? null : <Text preset="status">{erro}</Text>}

            <Button label={criando ? 'Criando…' : 'Criar conta'} onPress={criarConta} disabled={!podeCriarConta} />
            <Stack align="center">
              <Link label="Já tenho conta" onPress={onJaTenhoConta} preset="linkQuiet" />
            </Stack>
          </Stack>
        </FormColumn>
      </Screen>
    </KeyboardDismissArea>
  );
}
