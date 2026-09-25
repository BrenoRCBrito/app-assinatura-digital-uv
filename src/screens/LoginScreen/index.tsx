import React, { useState } from 'react';

import { Button, KeyboardDismissArea, Link, Logo, Screen, Stack, Text, TextField } from '../../components';
import { useAuthentication } from '../../hooks/useAuthentication';

type LoginScreenProps = Readonly<{
  onCriarConta: () => void;
}>;

export function LoginScreen({ onCriarConta }: LoginScreenProps) {
  const { mostrarEntrarComBiometria, loginComSenha, unlock } = useAuthentication();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

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

  return (
    <KeyboardDismissArea>
      <Screen
        preset="authScroll"
        footer={
          mostrarEntrarComBiometria ? (
            <Stack align="center">
              <Link label="Entrar com biometria" onPress={unlock} preset="linkPrimary" />
            </Stack>
          ) : undefined
        }
      >
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
          </Stack>
        </Stack>
      </Screen>
    </KeyboardDismissArea>
  );
}
