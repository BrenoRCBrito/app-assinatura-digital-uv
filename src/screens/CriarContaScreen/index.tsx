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
  showSuccess,
} from '../../components';
import { REQUISITOS_SENHA } from '../../domain/usuario';
import { useAuthentication } from '../../hooks/useAuthentication';
import { useAppTheme } from '../../theme';

type CriarContaScreenProps = Readonly<{
  onJaTenhoConta: () => void;
}>;

export function CriarContaScreen({ onJaTenhoConta }: CriarContaScreenProps) {
  const { cadastrar } = useAuthentication();
  const { theme } = useAppTheme();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const requisitos = REQUISITOS_SENHA.map((requisito) => ({ ...requisito, atendido: requisito.atendido(senha) }));
  const senhaValida = requisitos.every((requisito) => requisito.atendido);
  const mostrarSenhasDiferentes = confirmarSenha.length > 0 && senha !== confirmarSenha;
  const podeCriarConta =
    senhaValida &&
    senha === confirmarSenha &&
    email.trim().length > 0 &&
    nome.trim().length > 0 &&
    cpf.trim().length > 0 &&
    telefone.trim().length > 0 &&
    !criando;

  async function criarConta() {
    if (!podeCriarConta) {
      return;
    }
    setErro(null);
    setCriando(true);
    try {
      const resultado = await cadastrar({ email, senha, nome, cpf, telefone });
      if (resultado.ok) {
        showSuccess('Conta criada!');
      } else {
        setErro(resultado.mensagem);
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
                label="Nome"
                accessibilityLabel="Nome"
                value={nome}
                onChangeText={setNome}
                placeholder="Seu nome completo"
              />
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
                label="CPF"
                accessibilityLabel="CPF"
                value={cpf}
                onChangeText={setCpf}
                placeholder="000.000.000-00"
                keyboardType="number-pad"
              />
              <TextField
                label="Telefone"
                accessibilityLabel="Telefone"
                value={telefone}
                onChangeText={setTelefone}
                placeholder="(00) 00000-0000"
                keyboardType="phone-pad"
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
