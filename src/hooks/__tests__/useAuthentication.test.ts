import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { createIsoDateTime } from '../../domain/dateTime';
import { DEFAULT_SETTINGS, type Settings } from '../../domain/settings';
import { criarEmail, criarUsuarioId, type Email, type Usuario, type UsuarioId } from '../../domain/usuario';
import {
  authenticateDeviceOwner,
  getBiometricStatus,
  type AuthenticationResult,
} from '../../services/localAuthentication';
import { hashSenha } from '../../services/passwordHash';
import type { Repositories } from '../../storage/repositories';
import { useRepositories } from '../../storage/RepositoriesProvider';
import { useSettings } from '../../storage/SettingsProvider';
import { AuthenticationProvider, useAuthentication, type ResultadoLoginComSenha } from '../useAuthentication';

jest.mock('../../services/localAuthentication', () => ({
  authenticateDeviceOwner: jest.fn(),
  getBiometricStatus: jest.fn(),
}));
jest.mock('../../services/passwordHash', () => ({ hashSenha: jest.fn() }));
jest.mock('../../storage/RepositoriesProvider', () => ({ useRepositories: jest.fn() }));
jest.mock('../../storage/SettingsProvider', () => ({ useSettings: jest.fn() }));

const USUARIO_A = criarUsuarioId('1');
const USUARIO_B = criarUsuarioId('2');
const EMAIL_A = criarEmail('a@exemplo.com');
const EMAIL_B = criarEmail('b@exemplo.com');
const SENHA_HASH_A = 'hash-a';
const SENHA_HASH_B = 'hash-b';

function criarUsuarioDeTeste(id: UsuarioId, email: Email, senhaHash: string): Usuario {
  return { id, email, senhaHash, criadoEm: createIsoDateTime('2026-09-12T10:00:00.000Z') };
}

function mockUsuarios(usuarios: readonly Usuario[]) {
  const findByEmail = jest.fn(async (email: Email) => usuarios.find((usuario) => usuario.email === email) ?? null);
  jest.mocked(useRepositories).mockReturnValue({
    assinaturas: {} as never,
    documentos: {} as never,
    usuarios: { findByEmail, findById: jest.fn(), create: jest.fn(), clear: jest.fn() },
  } as Repositories);
}

// O mock precisa usar useState/useCallback de verdade — mutar um objeto comum não avisa
// o React que precisa re-renderizar, então updateSettings nunca "aparecia" no hook.
function mockSettings(overrides: Partial<Settings> = {}) {
  const inicial: Settings = { ...DEFAULT_SETTINGS, ...overrides };
  jest.mocked(useSettings).mockImplementation(() => {
    const [settings, setSettings] = useState(inicial);
    const updateSettings = useCallback((changes: Partial<Settings>) => {
      setSettings((atual) => ({ ...atual, ...changes }));
    }, []);
    return { settings, updateSettings };
  });
}

async function renderAuthentication() {
  const rendered = await renderHook(() => useAuthentication(), { wrapper: AuthenticationProvider });
  await waitFor(() => expect(rendered.result.current.biometricStatus).toBe('enrolled'));
  return rendered;
}

type BotoesDoAlerta = NonNullable<Parameters<typeof Alert.alert>[2]>;

function responderAlerta(texto: 'Sim' | 'Não') {
  const chamada = jest.mocked(Alert.alert).mock.calls.at(-1);
  const botoes = (chamada?.[2] ?? []) as BotoesDoAlerta;
  botoes.find((item) => item.text === texto)?.onPress?.();
}

describe('AuthenticationProvider', () => {
  let alerta: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getBiometricStatus).mockResolvedValue('enrolled');
    alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockSettings();
    mockUsuarios([]);
  });

  afterEach(() => {
    alerta.mockRestore();
  });

  test('começa bloqueado e carrega o estado da biometria', async () => {
    const { result } = await renderAuthentication();

    expect(result.current.isUnlocked).toBe(false);
    expect(result.current.authenticating).toBe(false);
    expect(result.current.usuarioId).toBeNull();
  });

  test('desbloqueia e assume o usuário salvo para login biométrico', async () => {
    mockSettings({
      loginBiometricoAtivado: true,
      perguntaBiometriaRespondida: true,
      ultimoUsuarioIdBiometria: USUARIO_A,
    });
    jest.mocked(authenticateDeviceOwner).mockResolvedValue({ type: 'authenticated' });
    const { result } = await renderAuthentication();

    await act(async () => {
      await result.current.unlock();
    });

    expect(authenticateDeviceOwner).toHaveBeenCalledWith('unlockApp');
    expect(result.current.isUnlocked).toBe(true);
    expect(result.current.usuarioId).toBe(USUARIO_A);
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

  test('trata erro inesperado como falha e continua bloqueado', async () => {
    jest.mocked(authenticateDeviceOwner).mockRejectedValue(new Error('falha inesperada'));
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const { result } = await renderAuthentication();

      await act(async () => {
        await result.current.unlock();
      });

      expect(result.current.authenticating).toBe(false);
      expect(result.current.isUnlocked).toBe(false);
      expect(alerta).toHaveBeenCalledWith('Não foi possível entrar', 'Não foi possível autenticar. Tente de novo.');
    } finally {
      consoleError.mockRestore();
    }
  });

  test('lock volta a bloquear e esquece o usuário depois de entrar', async () => {
    mockSettings({
      loginBiometricoAtivado: true,
      perguntaBiometriaRespondida: true,
      ultimoUsuarioIdBiometria: USUARIO_A,
    });
    jest.mocked(authenticateDeviceOwner).mockResolvedValue({ type: 'authenticated' });
    const { result } = await renderAuthentication();

    await act(async () => {
      await result.current.unlock();
    });
    await act(async () => {
      result.current.lock();
    });

    expect(result.current.isUnlocked).toBe(false);
    expect(result.current.usuarioId).toBeNull();
  });

  describe('loginComSenha', () => {
    test('com credenciais corretas, desbloqueia e guarda o usuário', async () => {
      mockUsuarios([criarUsuarioDeTeste(USUARIO_A, EMAIL_A, SENHA_HASH_A)]);
      jest.mocked(hashSenha).mockResolvedValue(SENHA_HASH_A);
      const { result } = await renderAuthentication();

      let resultado: ResultadoLoginComSenha | undefined;
      await act(async () => {
        resultado = await result.current.loginComSenha('a@exemplo.com', 'Senha@123');
      });

      expect(resultado).toEqual({ ok: true });
      expect(result.current.isUnlocked).toBe(true);
      expect(result.current.usuarioId).toBe(USUARIO_A);
    });

    test('com e-mail desconhecido, não desbloqueia', async () => {
      jest.mocked(hashSenha).mockResolvedValue(SENHA_HASH_A);
      const { result } = await renderAuthentication();

      let resultado: ResultadoLoginComSenha | undefined;
      await act(async () => {
        resultado = await result.current.loginComSenha('a@exemplo.com', 'Senha@123');
      });

      expect(resultado).toEqual({ ok: false, mensagem: 'E-mail ou senha inválidos.' });
      expect(result.current.isUnlocked).toBe(false);
    });

    test('com senha errada, não desbloqueia', async () => {
      mockUsuarios([criarUsuarioDeTeste(USUARIO_A, EMAIL_A, SENHA_HASH_A)]);
      jest.mocked(hashSenha).mockResolvedValue('hash-errada');
      const { result } = await renderAuthentication();

      let resultado: ResultadoLoginComSenha | undefined;
      await act(async () => {
        resultado = await result.current.loginComSenha('a@exemplo.com', 'errada');
      });

      expect(resultado).toEqual({ ok: false, mensagem: 'E-mail ou senha inválidos.' });
      expect(result.current.isUnlocked).toBe(false);
    });

    test('com e-mail em formato inválido, devolve a mensagem de validação', async () => {
      const { result } = await renderAuthentication();

      let resultado: ResultadoLoginComSenha | undefined;
      await act(async () => {
        resultado = await result.current.loginComSenha('não-é-email', 'Senha@123');
      });

      expect(resultado).toEqual({ ok: false, mensagem: 'Digite um e-mail válido.' });
    });
  });

  describe('pergunta sobre biometria após login com senha', () => {
    test('pergunta na primeira vez e "Sim" ativa a biometria pra essa conta', async () => {
      mockUsuarios([criarUsuarioDeTeste(USUARIO_A, EMAIL_A, SENHA_HASH_A)]);
      jest.mocked(hashSenha).mockResolvedValue(SENHA_HASH_A);
      const { result } = await renderAuthentication();

      await act(async () => {
        await result.current.loginComSenha('a@exemplo.com', 'Senha@123');
      });

      expect(alerta).toHaveBeenCalledTimes(1);
      await act(async () => {
        responderAlerta('Sim');
      });

      expect(result.current.mostrarEntrarComBiometria).toBe(true);
    });

    test('"Não" desativa e não pergunta de novo pra essa conta', async () => {
      mockUsuarios([criarUsuarioDeTeste(USUARIO_A, EMAIL_A, SENHA_HASH_A)]);
      jest.mocked(hashSenha).mockResolvedValue(SENHA_HASH_A);
      const { result } = await renderAuthentication();

      await act(async () => {
        await result.current.loginComSenha('a@exemplo.com', 'Senha@123');
      });
      await act(async () => {
        responderAlerta('Não');
      });
      alerta.mockClear();

      await act(async () => {
        result.current.lock();
      });
      await act(async () => {
        await result.current.loginComSenha('a@exemplo.com', 'Senha@123');
      });

      expect(alerta).not.toHaveBeenCalled();
    });

    test('pergunta de novo quando outra conta loga com senha', async () => {
      mockSettings({
        perguntaBiometriaRespondida: true,
        loginBiometricoAtivado: true,
        ultimoUsuarioIdBiometria: USUARIO_A,
      });
      mockUsuarios([
        criarUsuarioDeTeste(USUARIO_A, EMAIL_A, SENHA_HASH_A),
        criarUsuarioDeTeste(USUARIO_B, EMAIL_B, SENHA_HASH_B),
      ]);
      jest.mocked(hashSenha).mockResolvedValue(SENHA_HASH_B);
      const { result } = await renderAuthentication();

      await act(async () => {
        await result.current.loginComSenha('b@exemplo.com', 'Senha@123');
      });

      expect(alerta).toHaveBeenCalledTimes(1);
    });

    test('não pergunta quando o aparelho não tem biometria cadastrada', async () => {
      jest.mocked(getBiometricStatus).mockResolvedValue('notEnrolled');
      mockUsuarios([criarUsuarioDeTeste(USUARIO_A, EMAIL_A, SENHA_HASH_A)]);
      jest.mocked(hashSenha).mockResolvedValue(SENHA_HASH_A);
      const rendered = await renderHook(() => useAuthentication(), { wrapper: AuthenticationProvider });
      await waitFor(() => expect(rendered.result.current.biometricStatus).toBe('notEnrolled'));

      await act(async () => {
        await rendered.result.current.loginComSenha('a@exemplo.com', 'Senha@123');
      });

      expect(alerta).not.toHaveBeenCalled();
    });
  });
});
