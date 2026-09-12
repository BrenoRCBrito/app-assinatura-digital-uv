import * as LocalAuthentication from 'expo-local-authentication';

export type AuthenticationPurpose = 'unlockApp' | 'confirmSignature';

export type AuthenticationResult =
  | Readonly<{ type: 'authenticated' }>
  | Readonly<{ type: 'cancelled' }>
  | Readonly<{ type: 'lockedOut' }>
  | Readonly<{ type: 'unavailable' }>
  | Readonly<{ type: 'failed' }>;

export type BiometricStatus = 'enrolled' | 'notEnrolled' | 'noHardware';

const PROMPT_MESSAGES: Readonly<Record<AuthenticationPurpose, string>> = {
  unlockApp: 'Entre no Assina Aqui',
  confirmSignature: 'Confirme a assinatura do documento',
};

function toAuthenticationResult(error: LocalAuthentication.LocalAuthenticationError): AuthenticationResult {
  switch (error) {
    case 'user_cancel':
    case 'system_cancel':
    case 'app_cancel':
    case 'user_fallback':
      return { type: 'cancelled' };
    case 'lockout':
      return { type: 'lockedOut' };
    case 'not_available':
    case 'passcode_not_set':
    case 'not_enrolled':
      return { type: 'unavailable' };
    default:
      return { type: 'failed' };
  }
}

export async function authenticateDeviceOwner(purpose: AuthenticationPurpose): Promise<AuthenticationResult> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: PROMPT_MESSAGES[purpose],
      cancelLabel: 'Cancelar',
      fallbackLabel: 'Usar senha do aparelho',
      disableDeviceFallback: false,
    });
    return result.success ? { type: 'authenticated' } : toAuthenticationResult(result.error);
  } catch (error) {
    console.error('Falha ao autenticar o dono do aparelho:', error);
    return { type: 'failed' };
  }
}

export async function getBiometricStatus(): Promise<BiometricStatus> {
  try {
    if (!(await LocalAuthentication.hasHardwareAsync())) {
      return 'noHardware';
    }
    return (await LocalAuthentication.isEnrolledAsync()) ? 'enrolled' : 'notEnrolled';
  } catch (error) {
    console.error('Falha ao consultar a biometria do aparelho:', error);
    return 'noHardware';
  }
}
