import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { ValidationError } from '../domain/brand';
import { criarEmail, type UsuarioId } from '../domain/usuario';
import {
  authenticateDeviceOwner,
  getBiometricStatus,
  type AuthenticationResult,
  type BiometricStatus,
} from '../services/localAuthentication';
import { hashSenha } from '../services/passwordHash';
import { useRepositories } from '../storage/RepositoriesProvider';
import { useSettings } from '../storage/SettingsProvider';

export type ResultadoLoginComSenha = Readonly<{ ok: true }> | Readonly<{ ok: false; mensagem: string }>;

type AuthenticationContextValue = Readonly<{
  isUnlocked: boolean;
  authenticating: boolean;
  biometricStatus: BiometricStatus | null;
  usuarioId: UsuarioId | null;
  mostrarEntrarComBiometria: boolean;
  loginComSenha: (email: string, senha: string) => Promise<ResultadoLoginComSenha>;
  unlock: () => Promise<void>;
  lock: () => void;
}>;

type AuthenticationErrorType = Exclude<AuthenticationResult['type'], 'authenticated' | 'cancelled'>;

const AUTHENTICATION_ERROR_MESSAGES: Readonly<Record<AuthenticationErrorType, string>> = {
  lockedOut: 'Muitas tentativas. Use a senha do aparelho.',
  unavailable: 'Ative um bloqueio de tela no aparelho.',
  failed: 'Não foi possível autenticar. Tente de novo.',
};

const AuthenticationContext = createContext<AuthenticationContextValue | null>(null);

export function AuthenticationProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const { usuarios } = useRepositories();
  const { settings, updateSettings } = useSettings();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus | null>(null);
  const [usuarioId, setUsuarioId] = useState<UsuarioId | null>(null);
  // O state só chega à tela no próximo render; a ref barra o segundo toque antes disso.
  const authenticatingRef = useRef(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    let active = true;

    getBiometricStatus().then((status) => {
      if (active) {
        setBiometricStatus(status);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const perguntarSobreBiometria = useCallback(
  (usuarioLogadoId: UsuarioId) => {
    const jaConfiguradaParaEsseUsuario =
      settingsRef.current.perguntaBiometriaRespondida &&
      settingsRef.current.ultimoUsuarioIdBiometria === usuarioLogadoId;
    if (jaConfiguradaParaEsseUsuario || biometricStatus !== 'enrolled') {
      return;
    }
    Alert.alert('Entrar com biometria', 'Quer usar a biometria do aparelho para entrar da próxima vez?', [
      {
        text: 'Não',
        style: 'cancel',
        onPress: () =>
          updateSettings({
            perguntaBiometriaRespondida: true,
            loginBiometricoAtivado: false,
            ultimoUsuarioIdBiometria: null,
          }),
      },
      {
        text: 'Sim',
        onPress: () =>
          updateSettings({
            perguntaBiometriaRespondida: true,
            loginBiometricoAtivado: true,
            ultimoUsuarioIdBiometria: usuarioLogadoId,
          }),
      },
    ]);
  },
  [biometricStatus, updateSettings],
);


  const loginComSenha = useCallback(
    async (email: string, senha: string): Promise<ResultadoLoginComSenha> => {
      try {
        const emailValido = criarEmail(email);
        const usuario = await usuarios.findByEmail(emailValido);
        const senhaHash = await hashSenha(senha);
        if (usuario === null || usuario.senhaHash !== senhaHash) {
          return { ok: false, mensagem: 'E-mail ou senha inválidos.' };
        }
        setUsuarioId(usuario.id);
        setIsUnlocked(true);
        perguntarSobreBiometria(usuario.id);
        return { ok: true };
      } catch (error) {
        if (error instanceof ValidationError) {
          return { ok: false, mensagem: error.message };
        }
        console.error('Falha inesperada ao entrar com e-mail e senha:', error);
        return { ok: false, mensagem: 'Não foi possível entrar.' };
      }
    },
    [perguntarSobreBiometria, usuarios],
  );

  const unlock = useCallback(async () => {
    if (authenticatingRef.current) {
      return;
    }
    authenticatingRef.current = true;
    setAuthenticating(true);
    try {
      const result = await authenticateDeviceOwner('unlockApp');
      if (result.type === 'authenticated') {
        setUsuarioId(settingsRef.current.ultimoUsuarioIdBiometria as UsuarioId | null);
        setIsUnlocked(true);
      } else if (result.type !== 'cancelled') {
        Alert.alert('Não foi possível entrar', AUTHENTICATION_ERROR_MESSAGES[result.type]);
      }
    } catch (error) {
      console.error('Falha inesperada ao desbloquear o app:', error);
      Alert.alert('Não foi possível entrar', AUTHENTICATION_ERROR_MESSAGES.failed);
    } finally {
      authenticatingRef.current = false;
      setAuthenticating(false);
    }
  }, []);

  const lock = useCallback(() => {
    setIsUnlocked(false);
    setUsuarioId(null);
  }, []);

  const mostrarEntrarComBiometria = settings.loginBiometricoAtivado && biometricStatus === 'enrolled';

  const value = useMemo(
    () => ({
      isUnlocked,
      authenticating,
      biometricStatus,
      usuarioId,
      mostrarEntrarComBiometria,
      loginComSenha,
      unlock,
      lock,
    }),
    [isUnlocked, authenticating, biometricStatus, usuarioId, mostrarEntrarComBiometria, loginComSenha, unlock, lock],
  );

  return <AuthenticationContext.Provider value={value}>{children}</AuthenticationContext.Provider>;
}

export function useAuthentication(): AuthenticationContextValue {
  const context = useContext(AuthenticationContext);
  if (context === null) {
    throw new Error('useAuthentication precisa estar dentro de AuthenticationProvider.');
  }
  return context;
}
