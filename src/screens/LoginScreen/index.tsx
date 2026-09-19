import React, { useState } from 'react';
import { Keyboard, Pressable, View } from 'react-native';

import { Button, Logo, Screen, Stack, Text, TextField } from '../../components';
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
    <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss} accessible={false}>
      <Screen
        preset="immersive"
        footer={
          mostrarEntrarComBiometria ? (
            <Stack align="center">
              <Pressable accessibilityRole="link" onPress={unlock}>
                <Text preset="status" sizing={{ fontSize: 21, lineHeight: 27 }} >Entrar com biometria</Text>
              </Pressable>
            </Stack>
          ) : undefined
        }
      >
        <View style={{ paddingBottom: 120, alignSelf: 'stretch' }}>
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

            <Stack gap="label" align="center" >
              <Button  label={entrando ? 'Entrando…' : 'Entrar'} onPress={entrar} disabled={entrando}  />
              <Pressable accessibilityRole="link" onPress={onCriarConta}>
                <Text preset="status" sizing={{ fontSize: 18, lineHeight: 25 }}>Criar conta</Text>
              </Pressable>
            </Stack>
          </Stack>
        </View>
      </Screen>
    </Pressable>
  );
}
