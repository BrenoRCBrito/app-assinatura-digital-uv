import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import {
  authenticateDeviceOwner,
  getBiometricStatus,
  type AuthenticationResult,
} from '../../services/localAuthentication';
import { AuthenticationProvider, useAuthentication } from '../useAuthentication';

jest.mock('../../services/localAuthentication', () => ({
  authenticateDeviceOwner: jest.fn(),
  getBiometricStatus: jest.fn(),
}));

async function renderAuthentication() {
  const rendered = await renderHook(() => useAuthentication(), { wrapper: AuthenticationProvider });
  await waitFor(() => expect(rendered.result.current.biometricStatus).toBe('enrolled'));
  return rendered;
}

describe('AuthenticationProvider', () => {
  let alerta: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getBiometricStatus).mockResolvedValue('enrolled');
    alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    alerta.mockRestore();
  });

  test('começa bloqueado e carrega o estado da biometria', async () => {
    const { result } = await renderAuthentication();

    expect(result.current.isUnlocked).toBe(false);
    expect(result.current.authenticating).toBe(false);
  });

  test('desbloqueia quando o dono do aparelho é confirmado', async () => {
    jest.mocked(authenticateDeviceOwner).mockResolvedValue({ type: 'authenticated' });
    const { result } = await renderAuthentication();

    await act(async () => {
      await result.current.unlock();
    });

    expect(authenticateDeviceOwner).toHaveBeenCalledWith('unlockApp');
    expect(result.current.isUnlocked).toBe(true);
  });

  test('continua bloqueado e sem alerta quando o usuário cancela', async () => {
    jest.mocked(authenticateDeviceOwner).mockResolvedValue({ type: 'cancelled' });
    const { result } = await renderAuthentication();

    await act(async () => {
      await result.current.unlock();
    });

    expect(result.current.isUnlocked).toBe(false);
    expect(alerta).not.toHaveBeenCalled();
  });

  test.each([
    ['lockedOut', 'Muitas tentativas. Use a senha do aparelho.'],
    ['unavailable', 'Ative um bloqueio de tela no aparelho.'],
    ['failed', 'Não foi possível autenticar. Tente de novo.'],
  ] as const)('mostra a mensagem de %s e continua bloqueado', async (type, mensagem) => {
    jest.mocked(authenticateDeviceOwner).mockResolvedValue({ type });
    const { result } = await renderAuthentication();

    await act(async () => {
      await result.current.unlock();
    });

    expect(result.current.isUnlocked).toBe(false);
    expect(alerta).toHaveBeenCalledWith('Não foi possível entrar', mensagem);
  });

  test('ignora um segundo toque enquanto a autenticação está aberta', async () => {
    let concluir: (resultado: AuthenticationResult) => void = () => undefined;
    jest.mocked(authenticateDeviceOwner).mockImplementation(
      () =>
        new Promise((resolve) => {
          concluir = resolve;
        }),
    );
    const { result } = await renderAuthentication();

    let primeiroToque: Promise<void> = Promise.resolve();
    await act(async () => {
      primeiroToque = result.current.unlock();
      void result.current.unlock();
    });

    expect(authenticateDeviceOwner).toHaveBeenCalledTimes(1);
    expect(result.current.authenticating).toBe(true);

    await act(async () => {
      concluir({ type: 'authenticated' });
      await primeiroToque;
    });

    expect(result.current.authenticating).toBe(false);
    expect(result.current.isUnlocked).toBe(true);
  });

  test('libera a autenticação mesmo quando o serviço falha', async () => {
    jest.mocked(authenticateDeviceOwner).mockRejectedValue(new Error('falha inesperada'));
    const { result } = await renderAuthentication();

    await act(async () => {
      await expect(result.current.unlock()).rejects.toThrow('falha inesperada');
    });

    expect(result.current.authenticating).toBe(false);
    expect(result.current.isUnlocked).toBe(false);
  });

  test('lock volta a bloquear depois de entrar', async () => {
    jest.mocked(authenticateDeviceOwner).mockResolvedValue({ type: 'authenticated' });
    const { result } = await renderAuthentication();

    await act(async () => {
      await result.current.unlock();
    });
    await act(async () => {
      result.current.lock();
    });

    expect(result.current.isUnlocked).toBe(false);
  });
});
