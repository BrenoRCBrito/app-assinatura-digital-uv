import React, { useState } from 'react';

import { Avatar, Button, KeyboardDismissArea, Link, Logo, Screen, Stack, Text, TextField } from '../../components';
import { mascararCpfParcial } from '../../domain/usuario';
import { useAuthentication } from '../../hooks/useAuthentication';

type LoginScreenProps = Readonly<{
  onCriarConta: () => void;
  onValidarDocumento: () => void;
}>;

export function LoginScreen({ onCriarConta, onValidarDocumento }: LoginScreenProps) {
  const { mostrarEntrarComBiometria, usuarioBiometria, authenticating, loginComSenha, unlock } = useAuthentication();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [usarSenha, setUsarSenha] = useState(false);

  async function entrar() {
    setErro(null);
    setEntrando(true);
    try {
      const resultado = await loginComSenha(email, senha);
      if (!resultado.ok) {
        setErro(resultado.mensagem);
      }
    } finally {
      setEntrando(false);
    }
  }

  const mostrarAcessoRapido = mostrarEntrarComBiometria && usuarioBiometria !== null && !usarSenha;

  if (mostrarAcessoRapido) {
    const nomeExibido = usuarioBiometria.nome ?? usuarioBiometria.email;

    return (
      <KeyboardDismissArea>
        <Screen preset="authScroll">
          <Stack gap="hero" align="center">
            <Avatar fotoBase64={usuarioBiometria.foto} />
            <Stack gap="text" align="center">
              <Text preset="screenTitle">{nomeExibido}</Text>
              {usuarioBiometria.cpf === null ? null : (
                <Text preset="supporting">{mascararCpfParcial(usuarioBiometria.cpf)}</Text>
              )}
            </Stack>
            <Stack gap="label" align="center">
              <Button label={authenticating ? 'Verificando…' : 'Acessar'} onPress={unlock} disabled={authenticating} />
              <Link label="Entrar com outra conta" onPress={() => setUsarSenha(true)} preset="linkQuiet" />
            </Stack>
          </Stack>
        </Screen>
      </KeyboardDismissArea>
    );
  }

  return (
    <KeyboardDismissArea>
      <Screen preset="authScroll">
        <Stack gap="hero" align="center">
          <Logo />
          <Text preset="brand">Assina Aqui</Text>

          <Stack gap="block" align="stretch">
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
              placeholder="Sua senha"
              secureTextEntry
            />
            {erro === null ? null : <Text preset="status">{erro}</Text>}
          </Stack>

          <Stack gap="label" align="center">
            <Button label={entrando ? 'Entrando…' : 'Entrar'} onPress={entrar} disabled={entrando} />
            <Link label="Criar conta" onPress={onCriarConta} />
            <Link label="Validar um documento" onPress={onValidarDocumento} preset="linkQuiet" />
            {mostrarEntrarComBiometria && usuarioBiometria !== null ? (
              <Link label="Usar biometria" onPress={() => setUsarSenha(false)} preset="linkQuiet" />
            ) : null}
          </Stack>
        </Stack>
      </Screen>
    </KeyboardDismissArea>
  );
}
