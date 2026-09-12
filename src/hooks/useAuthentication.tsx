import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';

import {
  authenticateDeviceOwner,
  getBiometricStatus,
  type AuthenticationResult,
  type BiometricStatus,
} from '../services/localAuthentication';

type AuthenticationContextValue = Readonly<{
  isUnlocked: boolean;
  authenticating: boolean;
  biometricStatus: BiometricStatus | null;
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
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus | null>(null);
  // O state só chega à tela no próximo render; a ref barra o segundo toque antes disso.
  const authenticatingRef = useRef(false);

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

  const unlock = useCallback(async () => {
    if (authenticatingRef.current) {
      return;
    }
    authenticatingRef.current = true;
    setAuthenticating(true);
    try {
      const result = await authenticateDeviceOwner('unlockApp');
      if (result.type === 'authenticated') {
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
  }, []);

  const value = useMemo(
    () => ({ isUnlocked, authenticating, biometricStatus, unlock, lock }),
    [isUnlocked, authenticating, biometricStatus, unlock, lock],
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
