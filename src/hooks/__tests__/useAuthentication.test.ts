import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { createIsoDateTime } from '../../domain/dateTime';
import { DEFAULT_SETTINGS, type Settings } from '../../domain/settings';
import { criarEmail, criarUsuarioId, type Email, type Usuario, type UsuarioId } from '../../domain/usuario';
import {
  cadastrarNoFirebase,
  contaDoFirebase,
  entrarNoFirebase,
  mensagemDoErroDeAutenticacao,
  sairDoFirebase,
  type ContaFirebase,
} from '../../services/autenticacaoFirebase';
import {
  authenticateDeviceOwner,
  getBiometricStatus,
  type AuthenticationResult,
} from '../../services/localAuthentication';
import type { Repositories } from '../../storage/repositories';
import { useRepositories } from '../../storage/RepositoriesProvider';
import { useSettings } from '../../storage/SettingsProvider';
import {
  AuthenticationProvider,
  useAuthentication,
  type DadosDoCadastro,
  type ResultadoLoginComSenha,
} from '../useAuthentication';

jest.mock('../../services/localAuthentication', () => ({
  authenticateDeviceOwner: jest.fn(),
  getBiometricStatus: jest.fn(),
}));
jest.mock('../../services/autenticacaoFirebase', () => ({
  cadastrarNoFirebase: jest.fn(),
  contaDoFirebase: jest.fn(),
  entrarNoFirebase: jest.fn(),
  sairDoFirebase: jest.fn(),
  mensagemDoErroDeAutenticacao: jest.fn(),
}));
jest.mock('../../storage/RepositoriesProvider', () => ({ useRepositories: jest.fn() }));
jest.mock('../../storage/SettingsProvider', () => ({ useSettings: jest.fn() }));

const MENSAGENS_DO_FIREBASE: Readonly<Record<string, string>> = {
  'auth/invalid-credential': 'E-mail ou senha inválidos.',
  'auth/network-request-failed': 'Sem conexão com a internet. Conecte-se para continuar.',
  'auth/email-already-in-use': 'Este e-mail já tem uma conta.',
};

const USUARIO_A = criarUsuarioId('1');
const USUARIO_B = criarUsuarioId('2');
const EMAIL_A = criarEmail('a@exemplo.com');
const EMAIL_B = criarEmail('b@exemplo.com');
const CONTA_A: ContaFirebase = { uid: USUARIO_A, email: EMAIL_A };
const CONTA_B: ContaFirebase = { uid: USUARIO_B, email: EMAIL_B };
const CADASTRO: DadosDoCadastro = {
  email: 'novo@exemplo.com',
  senha: 'Senha@123',
  nome: 'Ana Souza',
  cpf: '111.444.777-35',
  telefone: '(11) 98765-4321',
};

function criarUsuarioDeTeste(id: UsuarioId, email: Email): Usuario {
  return {
    id,
    email,
    nome: null,
    cpf: null,
    telefone: null,
    foto: null,
    criadoEm: createIsoDateTime('2026-09-12T10:00:00.000Z'),
  };
}

function mockUsuarios(usuarios: readonly Usuario[]) {
  const findById = jest.fn(async (id: UsuarioId) => usuarios.find((usuario) => usuario.id === id) ?? null);
  const create = jest.fn(async ({ id, email }: { id: UsuarioId; email: Email }) => criarUsuarioDeTeste(id, email));
  const updateEmail = jest.fn(async (id: UsuarioId, email: Email) => criarUsuarioDeTeste(id, email));
  jest.mocked(useRepositories).mockReturnValue({
    assinaturas: {} as never,
    documentos: {} as never,
    usuarios: {
      findByEmail: jest.fn(),
      findById,
      create,
      updateEmail,
      updateNome: jest.fn(),
      updateCpf: jest.fn(),
      updateTelefone: jest.fn(),
      updateFoto: jest.fn(),
      clear: jest.fn(),
    },
  } as Repositories);
  return { findById, create, updateEmail };
}

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

function erroDoFirebase(code: string): Error {
  return Object.assign(new Error(code), { code });
}

const BIOMETRIA_DA_CONTA_A: Partial<Settings> = {
  loginBiometricoAtivado: true,
  perguntaBiometriaRespondida: true,
  ultimoUsuarioIdBiometria: USUARIO_A,
};

describe('AuthenticationProvider', () => {
  let alerta: jest.SpyInstance;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(getBiometricStatus).mockResolvedValue('enrolled');
    jest.mocked(sairDoFirebase).mockResolvedValue(undefined);
    jest
      .mocked(mensagemDoErroDeAutenticacao)
      .mockImplementation((erro) => MENSAGENS_DO_FIREBASE[(erro as { code?: string }).code ?? ''] ?? null);
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

  describe('unlock (biometria)', () => {
    test('desbloqueia e assume a conta da sessão guardada do Firebase', async () => {
      mockSettings(BIOMETRIA_DA_CONTA_A);
      mockUsuarios([criarUsuarioDeTeste(USUARIO_A, EMAIL_A)]);
      jest.mocked(authenticateDeviceOwner).mockResolvedValue({ type: 'authenticated' });
      jest.mocked(contaDoFirebase).mockResolvedValue(CONTA_A);
      const { result } = await renderAuthentication();

      await act(async () => {
        await result.current.unlock();
      });

      expect(authenticateDeviceOwner).toHaveBeenCalledWith('unlockApp');
      expect(result.current.isUnlocked).toBe(true);
      expect(result.current.usuarioId).toBe(USUARIO_A);
      expect(alerta).not.toHaveBeenCalled();
    });

    test('sem sessão no Firebase, não desbloqueia, avisa e desliga a entrada por biometria', async () => {
      mockSettings(BIOMETRIA_DA_CONTA_A);
      jest.mocked(authenticateDeviceOwner).mockResolvedValue({ type: 'authenticated' });
      jest.mocked(contaDoFirebase).mockResolvedValue(null);
      const { result } = await renderAuthentication();
      expect(result.current.mostrarEntrarComBiometria).toBe(true);

      await act(async () => {
        await result.current.unlock();
      });

      expect(result.current.isUnlocked).toBe(false);
      expect(result.current.usuarioId).toBeNull();
      expect(alerta).toHaveBeenCalledWith('Não foi possível entrar', 'Sua sessão terminou. Entre com e-mail e senha.');
      expect(result.current.mostrarEntrarComBiometria).toBe(false);
    });

    test('se a sessão é de outra conta, também não desbloqueia', async () => {
      mockSettings(BIOMETRIA_DA_CONTA_A);
      jest.mocked(authenticateDeviceOwner).mockResolvedValue({ type: 'authenticated' });
      jest.mocked(contaDoFirebase).mockResolvedValue(CONTA_B);
      const { result } = await renderAuthentication();

      await act(async () => {
        await result.current.unlock();
      });

      expect(result.current.isUnlocked).toBe(false);
      expect(alerta).toHaveBeenCalledWith('Não foi possível entrar', 'Sua sessão terminou. Entre com e-mail e senha.');
    });

    test('se o perfil não está mais neste aparelho, recria só com o e-mail da conta', async () => {
      mockSettings(BIOMETRIA_DA_CONTA_A);
      const { create } = mockUsuarios([]);
      jest.mocked(authenticateDeviceOwner).mockResolvedValue({ type: 'authenticated' });
      jest.mocked(contaDoFirebase).mockResolvedValue(CONTA_A);
      const { result } = await renderAuthentication();

      await act(async () => {
        await result.current.unlock();
      });

      expect(create).toHaveBeenCalledWith({ id: USUARIO_A, email: EMAIL_A });
      expect(result.current.isUnlocked).toBe(true);
    });

    test('a sessão do Firebase só é consultada depois que a biometria passa', async () => {
      jest.mocked(authenticateDeviceOwner).mockResolvedValue({ type: 'cancelled' });
      const { result } = await renderAuthentication();

      await act(async () => {
        await result.current.unlock();
      });

      expect(contaDoFirebase).not.toHaveBeenCalled();
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
      mockSettings(BIOMETRIA_DA_CONTA_A);
      mockUsuarios([criarUsuarioDeTeste(USUARIO_A, EMAIL_A)]);
      jest.mocked(contaDoFirebase).mockResolvedValue(CONTA_A);
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

    test('falha ao consultar o Firebase também vira o aviso de falha', async () => {
      mockSettings(BIOMETRIA_DA_CONTA_A);
      jest.mocked(authenticateDeviceOwner).mockResolvedValue({ type: 'authenticated' });
      jest.mocked(contaDoFirebase).mockRejectedValue(new Error('Configuração do Firebase ausente'));
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      try {
        const { result } = await renderAuthentication();

        await act(async () => {
          await result.current.unlock();
        });

        expect(result.current.isUnlocked).toBe(false);
        expect(alerta).toHaveBeenCalledWith('Não foi possível entrar', 'Não foi possível autenticar. Tente de novo.');
      } finally {
        consoleError.mockRestore();
      }
    });
  });

  describe('sair', () => {
    test('encerra a sessão do Firebase, bloqueia e esquece o usuário', async () => {
      mockSettings(BIOMETRIA_DA_CONTA_A);
      mockUsuarios([criarUsuarioDeTeste(USUARIO_A, EMAIL_A)]);
      jest.mocked(authenticateDeviceOwner).mockResolvedValue({ type: 'authenticated' });
      jest.mocked(contaDoFirebase).mockResolvedValue(CONTA_A);
      const { result } = await renderAuthentication();
      await act(async () => {
        await result.current.unlock();
      });

      await act(async () => {
        await result.current.sair();
      });

      expect(sairDoFirebase).toHaveBeenCalledTimes(1);
      expect(result.current.isUnlocked).toBe(false);
      expect(result.current.usuarioId).toBeNull();
    });

    test('desliga a entrada por biometria, porque sem sessão ela não tem como abrir a conta', async () => {
      mockSettings(BIOMETRIA_DA_CONTA_A);
      const { result } = await renderAuthentication();
      expect(result.current.mostrarEntrarComBiometria).toBe(true);

      await act(async () => {
        await result.current.sair();
      });

      expect(result.current.mostrarEntrarComBiometria).toBe(false);
    });

    test('se o Firebase falhar ao encerrar a sessão, o app sai mesmo assim', async () => {
      jest.mocked(sairDoFirebase).mockRejectedValue(new Error('falha'));
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      try {
        mockUsuarios([criarUsuarioDeTeste(USUARIO_A, EMAIL_A)]);
        jest.mocked(entrarNoFirebase).mockResolvedValue(CONTA_A);
        const { result } = await renderAuthentication();
        await act(async () => {
          await result.current.loginComSenha('a@exemplo.com', 'Senha@123');
        });

        await act(async () => {
          await result.current.sair();
        });

        expect(result.current.isUnlocked).toBe(false);
        expect(result.current.usuarioId).toBeNull();
        expect(consoleError).toHaveBeenCalledTimes(1);
      } finally {
        consoleError.mockRestore();
      }
    });
  });

  describe('loginComSenha', () => {
    test('com credenciais corretas, entra no Firebase, desbloqueia e guarda o usuário', async () => {
      const { create, updateEmail } = mockUsuarios([criarUsuarioDeTeste(USUARIO_A, EMAIL_A)]);
      jest.mocked(entrarNoFirebase).mockResolvedValue(CONTA_A);
      const { result } = await renderAuthentication();

      let resultado: ResultadoLoginComSenha | undefined;
      await act(async () => {
        resultado = await result.current.loginComSenha('A@Exemplo.com', 'Senha@123');
      });

      expect(entrarNoFirebase).toHaveBeenCalledWith('a@exemplo.com', 'Senha@123');
      expect(resultado).toEqual({ ok: true });
      expect(result.current.isUnlocked).toBe(true);
      expect(result.current.usuarioId).toBe(USUARIO_A);
      expect(create).not.toHaveBeenCalled();
      expect(updateEmail).not.toHaveBeenCalled();
    });

    test('no primeiro acesso neste aparelho, cria o perfil só com o e-mail da conta', async () => {
      const { create } = mockUsuarios([]);
      jest.mocked(entrarNoFirebase).mockResolvedValue(CONTA_A);
      const { result } = await renderAuthentication();

      await act(async () => {
        await result.current.loginComSenha('a@exemplo.com', 'Senha@123');
      });

      expect(create).toHaveBeenCalledWith({ id: USUARIO_A, email: EMAIL_A });
      expect(result.current.usuarioId).toBe(USUARIO_A);
    });

    test('se o e-mail da conta mudou do lado do Firebase, o perfil acompanha', async () => {
      const { updateEmail } = mockUsuarios([criarUsuarioDeTeste(USUARIO_A, criarEmail('antigo@exemplo.com'))]);
      jest.mocked(entrarNoFirebase).mockResolvedValue(CONTA_A);
      const { result } = await renderAuthentication();

      await act(async () => {
        await result.current.loginComSenha('a@exemplo.com', 'Senha@123');
      });

      expect(updateEmail).toHaveBeenCalledWith(USUARIO_A, EMAIL_A);
    });

    test.each([
      ['auth/invalid-credential', 'E-mail ou senha inválidos.'],
      ['auth/network-request-failed', 'Sem conexão com a internet. Conecte-se para continuar.'],
    ])('com o erro %s do Firebase, não desbloqueia e mostra a mensagem em português', async (codigo, mensagem) => {
      jest.mocked(entrarNoFirebase).mockRejectedValue(erroDoFirebase(codigo));
      const { result } = await renderAuthentication();

      let resultado: ResultadoLoginComSenha | undefined;
      await act(async () => {
        resultado = await result.current.loginComSenha('a@exemplo.com', 'errada');
      });

      expect(resultado).toEqual({ ok: false, mensagem });
      expect(result.current.isUnlocked).toBe(false);
    });

    test('com e-mail em formato inválido, devolve a mensagem de validação sem falar com o Firebase', async () => {
      const { result } = await renderAuthentication();

      let resultado: ResultadoLoginComSenha | undefined;
      await act(async () => {
        resultado = await result.current.loginComSenha('não-é-email', 'Senha@123');
      });

      expect(resultado).toEqual({ ok: false, mensagem: 'Digite um e-mail válido.' });
      expect(entrarNoFirebase).not.toHaveBeenCalled();
    });

    test('erro inesperado vira mensagem genérica e fica registrado no console', async () => {
      jest.mocked(entrarNoFirebase).mockRejectedValue(new Error('inesperado'));
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      try {
        const { result } = await renderAuthentication();

        let resultado: ResultadoLoginComSenha | undefined;
        await act(async () => {
          resultado = await result.current.loginComSenha('a@exemplo.com', 'Senha@123');
        });

        expect(resultado).toEqual({ ok: false, mensagem: 'Não foi possível entrar.' });
        expect(consoleError).toHaveBeenCalledTimes(1);
      } finally {
        consoleError.mockRestore();
      }
    });
  });

  describe('cadastrar', () => {
    const CONTA_NOVA: ContaFirebase = { uid: 'uid-novo', email: 'novo@exemplo.com' };

    test('cria a conta no Firebase, guarda o perfil e já deixa a pessoa logada', async () => {
      const { create } = mockUsuarios([]);
      jest.mocked(cadastrarNoFirebase).mockResolvedValue(CONTA_NOVA);
      const { result } = await renderAuthentication();

      let resultado: ResultadoLoginComSenha | undefined;
      await act(async () => {
        resultado = await result.current.cadastrar(CADASTRO);
      });

      expect(cadastrarNoFirebase).toHaveBeenCalledWith('novo@exemplo.com', 'Senha@123');
      expect(create).toHaveBeenCalledWith({
        id: 'uid-novo',
        email: 'novo@exemplo.com',
        nome: 'Ana Souza',
        cpf: '11144477735',
        telefone: '11987654321',
      });
      expect(resultado).toEqual({ ok: true });
      expect(result.current.isUnlocked).toBe(true);
      expect(result.current.usuarioId).toBe('uid-novo');
    });

    test('depois de criar a conta, pergunta sobre a biometria', async () => {
      mockUsuarios([]);
      jest.mocked(cadastrarNoFirebase).mockResolvedValue(CONTA_NOVA);
      const { result } = await renderAuthentication();

      await act(async () => {
        await result.current.cadastrar(CADASTRO);
      });

      expect(alerta).toHaveBeenCalledWith('Entrar com biometria', expect.any(String), expect.any(Array));
    });

    test('e-mail que já tem conta: mostra a mensagem, não guarda perfil e não loga', async () => {
      const { create } = mockUsuarios([]);
      jest.mocked(cadastrarNoFirebase).mockRejectedValue(erroDoFirebase('auth/email-already-in-use'));
      const { result } = await renderAuthentication();

      let resultado: ResultadoLoginComSenha | undefined;
      await act(async () => {
        resultado = await result.current.cadastrar(CADASTRO);
      });

      expect(resultado).toEqual({ ok: false, mensagem: 'Este e-mail já tem uma conta.' });
      expect(create).not.toHaveBeenCalled();
      expect(result.current.isUnlocked).toBe(false);
    });

    test.each([
      ['e-mail', { email: 'sem-arroba' }, 'Digite um e-mail válido.'],
      ['nome', { nome: ' ' }, 'Digite um nome válido.'],
      ['CPF', { cpf: '111.111.111-11' }, 'Digite um CPF válido.'],
      ['telefone', { telefone: '123' }, 'Digite um telefone válido, com DDD.'],
    ])('com %s inválido, devolve a mensagem sem criar conta no Firebase', async (_campo, alteracao, mensagem) => {
      const { result } = await renderAuthentication();

      let resultado: ResultadoLoginComSenha | undefined;
      await act(async () => {
        resultado = await result.current.cadastrar({ ...CADASTRO, ...alteracao });
      });

      expect(resultado).toEqual({ ok: false, mensagem });
      expect(cadastrarNoFirebase).not.toHaveBeenCalled();
    });

    test('se o perfil não puder ser guardado, encerra a sessão e pede para entrar de novo', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      try {
        const { create } = mockUsuarios([]);
        create.mockRejectedValue(new Error('disco cheio'));
        jest.mocked(cadastrarNoFirebase).mockResolvedValue(CONTA_NOVA);
        const { result } = await renderAuthentication();

        let resultado: ResultadoLoginComSenha | undefined;
        await act(async () => {
          resultado = await result.current.cadastrar(CADASTRO);
        });

        expect(resultado).toEqual({
          ok: false,
          mensagem:
            'A conta foi criada, mas não foi possível salvar seus dados neste aparelho. Entre com e-mail e senha.',
        });
        expect(sairDoFirebase).toHaveBeenCalledTimes(1);
        expect(result.current.isUnlocked).toBe(false);
      } finally {
        consoleError.mockRestore();
      }
    });

    test('erro inesperado vira mensagem genérica', async () => {
      jest.mocked(cadastrarNoFirebase).mockRejectedValue(new Error('inesperado'));
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      try {
        const { result } = await renderAuthentication();

        let resultado: ResultadoLoginComSenha | undefined;
        await act(async () => {
          resultado = await result.current.cadastrar(CADASTRO);
        });

        expect(resultado).toEqual({ ok: false, mensagem: 'Não foi possível criar a conta.' });
      } finally {
        consoleError.mockRestore();
      }
    });
  });

  describe('pergunta sobre biometria após login com senha', () => {
    test('pergunta na primeira vez e "Sim" ativa a biometria pra essa conta', async () => {
      mockUsuarios([criarUsuarioDeTeste(USUARIO_A, EMAIL_A)]);
      jest.mocked(entrarNoFirebase).mockResolvedValue(CONTA_A);
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

    test('"Não" desativa e, sem sair da conta, não pergunta de novo pra essa conta', async () => {
      mockUsuarios([criarUsuarioDeTeste(USUARIO_A, EMAIL_A)]);
      jest.mocked(entrarNoFirebase).mockResolvedValue(CONTA_A);
      const { result } = await renderAuthentication();

      await act(async () => {
        await result.current.loginComSenha('a@exemplo.com', 'Senha@123');
      });
      await act(async () => {
        responderAlerta('Não');
      });
      alerta.mockClear();

      await act(async () => {
        await result.current.loginComSenha('a@exemplo.com', 'Senha@123');
      });

      expect(alerta).not.toHaveBeenCalled();
    });

    test('depois de Sair da conta, pergunta de novo no próximo login', async () => {
      mockUsuarios([criarUsuarioDeTeste(USUARIO_A, EMAIL_A)]);
      jest.mocked(entrarNoFirebase).mockResolvedValue(CONTA_A);
      const { result } = await renderAuthentication();
      await act(async () => {
        await result.current.loginComSenha('a@exemplo.com', 'Senha@123');
      });
      await act(async () => {
        responderAlerta('Não');
      });
      await act(async () => {
        await result.current.sair();
      });
      alerta.mockClear();

      await act(async () => {
        await result.current.loginComSenha('a@exemplo.com', 'Senha@123');
      });

      expect(alerta).toHaveBeenCalledTimes(1);
    });

    test('pergunta de novo quando outra conta loga com senha', async () => {
      mockSettings(BIOMETRIA_DA_CONTA_A);
      mockUsuarios([criarUsuarioDeTeste(USUARIO_A, EMAIL_A), criarUsuarioDeTeste(USUARIO_B, EMAIL_B)]);
      jest.mocked(entrarNoFirebase).mockResolvedValue(CONTA_B);
      const { result } = await renderAuthentication();

      await act(async () => {
        await result.current.loginComSenha('b@exemplo.com', 'Senha@123');
      });

      expect(alerta).toHaveBeenCalledTimes(1);
    });

    test('não pergunta quando o aparelho não tem biometria cadastrada', async () => {
      jest.mocked(getBiometricStatus).mockResolvedValue('notEnrolled');
      mockUsuarios([criarUsuarioDeTeste(USUARIO_A, EMAIL_A)]);
      jest.mocked(entrarNoFirebase).mockResolvedValue(CONTA_A);
      const rendered = await renderHook(() => useAuthentication(), { wrapper: AuthenticationProvider });
      await waitFor(() => expect(rendered.result.current.biometricStatus).toBe('notEnrolled'));

      await act(async () => {
        await rendered.result.current.loginComSenha('a@exemplo.com', 'Senha@123');
      });

      expect(alerta).not.toHaveBeenCalled();
    });
  });

  describe('usuarioBiometria', () => {
    test('carrega o usuário salvo quando a biometria está ativada', async () => {
      mockSettings(BIOMETRIA_DA_CONTA_A);
      mockUsuarios([criarUsuarioDeTeste(USUARIO_A, EMAIL_A)]);
      const { result } = await renderAuthentication();

      await waitFor(() => expect(result.current.usuarioBiometria?.id).toBe(USUARIO_A));
    });

    test('fica null quando a biometria não está ativada', async () => {
      mockUsuarios([criarUsuarioDeTeste(USUARIO_A, EMAIL_A)]);
      const { result } = await renderAuthentication();

      expect(result.current.usuarioBiometria).toBeNull();
    });
  });
});
