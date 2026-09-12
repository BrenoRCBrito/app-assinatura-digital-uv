import * as LocalAuthentication from 'expo-local-authentication';

import { authenticateDeviceOwner, getBiometricStatus } from '../localAuthentication';

jest.mock('expo-local-authentication', () => ({
  authenticateAsync: jest.fn(),
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
}));

describe('authenticateDeviceOwner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('devolve authenticated quando o aparelho confirma o dono', async () => {
    jest.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({ success: true });

    await expect(authenticateDeviceOwner('unlockApp')).resolves.toEqual({ type: 'authenticated' });
  });

  test('aceita a senha do aparelho e usa o texto do propósito', async () => {
    jest.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({ success: true });

    await authenticateDeviceOwner('confirmSignature');

    expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        promptMessage: 'Confirme a assinatura do documento',
        disableDeviceFallback: false,
      }),
    );
  });

  test.each([
    ['user_cancel', 'cancelled'],
    ['system_cancel', 'cancelled'],
    ['app_cancel', 'cancelled'],
    ['user_fallback', 'cancelled'],
    ['lockout', 'lockedOut'],
    ['not_available', 'unavailable'],
    ['passcode_not_set', 'unavailable'],
    ['not_enrolled', 'unavailable'],
    ['authentication_failed', 'failed'],
    ['unknown', 'failed'],
  ] as const)('converte o erro %s em %s', async (error, type) => {
    jest.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({ success: false, error });

    await expect(authenticateDeviceOwner('unlockApp')).resolves.toEqual({ type });
  });

  test('devolve failed quando o módulo nativo lança erro', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      jest.mocked(LocalAuthentication.authenticateAsync).mockRejectedValue(new Error('falha nativa'));

      await expect(authenticateDeviceOwner('unlockApp')).resolves.toEqual({ type: 'failed' });
    } finally {
      consoleError.mockRestore();
    }
  });
});

describe('getBiometricStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('devolve noHardware quando o aparelho não tem sensor', async () => {
    jest.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(false);

    await expect(getBiometricStatus()).resolves.toBe('noHardware');
    expect(LocalAuthentication.isEnrolledAsync).not.toHaveBeenCalled();
  });

  test('devolve notEnrolled quando há sensor sem biometria cadastrada', async () => {
    jest.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
    jest.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(false);

    await expect(getBiometricStatus()).resolves.toBe('notEnrolled');
  });

  test('devolve enrolled quando há biometria cadastrada', async () => {
    jest.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
    jest.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(true);

    await expect(getBiometricStatus()).resolves.toBe('enrolled');
  });
});
