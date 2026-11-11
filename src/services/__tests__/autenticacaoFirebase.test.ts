import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'firebase/auth';

import {
  alterarSenhaNoFirebase,
  cadastrarNoFirebase,
  codigoDoErroDeAutenticacao,
  contaDoFirebase,
  ehCredencialInvalida,
  entrarNoFirebase,
  mensagemDoErroDeAutenticacao,
  sairDoFirebase,
} from '../autenticacaoFirebase';
import { obterAuth } from '../firebase';

jest.mock('../firebase', () => ({ obterAuth: jest.fn() }));
jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  EmailAuthProvider: { credential: jest.fn() },
  reauthenticateWithCredential: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  updatePassword: jest.fn(),
}));

const USUARIO = { uid: 'uid-123', email: 'ana@exemplo.com' };
const CREDENCIAL = { tipo: 'credencial' };

function criarAuth(currentUser: unknown = USUARIO) {
  const auth = { currentUser, authStateReady: jest.fn().mockResolvedValue(undefined) };
  jest.mocked(obterAuth).mockReturnValue(auth as never);
  return auth;
}

describe('autenticacaoFirebase', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(EmailAuthProvider.credential).mockReturnValue(CREDENCIAL as never);
  });

  describe('cadastrarNoFirebase e entrarNoFirebase', () => {
    test('cadastrar cria a conta e devolve o uid e o e-mail', async () => {
      const auth = criarAuth();
      jest.mocked(createUserWithEmailAndPassword).mockResolvedValue({ user: USUARIO } as never);

      await expect(cadastrarNoFirebase('ana@exemplo.com', 'Senha#123')).resolves.toEqual(USUARIO);

      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(auth, 'ana@exemplo.com', 'Senha#123');
    });

    test('entrar autentica e devolve o uid e o e-mail', async () => {
      const auth = criarAuth();
      jest.mocked(signInWithEmailAndPassword).mockResolvedValue({ user: USUARIO } as never);

      await expect(entrarNoFirebase('ana@exemplo.com', 'Senha#123')).resolves.toEqual(USUARIO);

      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(auth, 'ana@exemplo.com', 'Senha#123');
    });

    test('o erro do Firebase chega a quem chamou, com o código', async () => {
      criarAuth();
      const erro = Object.assign(new Error('x'), { code: 'auth/email-already-in-use' });
      jest.mocked(createUserWithEmailAndPassword).mockRejectedValue(erro);

      await expect(cadastrarNoFirebase('ana@exemplo.com', 'Senha#123')).rejects.toBe(erro);
    });

    test('conta sem e-mail é recusada', async () => {
      criarAuth();
      jest.mocked(signInWithEmailAndPassword).mockResolvedValue({ user: { uid: 'u', email: null } } as never);

      await expect(entrarNoFirebase('a@b.com', 'x')).rejects.toThrow('A conta do Firebase não tem e-mail.');
    });
  });

  describe('sairDoFirebase', () => {
    test('encerra a sessão', async () => {
      const auth = criarAuth();
      jest.mocked(signOut).mockResolvedValue(undefined);

      await sairDoFirebase();

      expect(signOut).toHaveBeenCalledWith(auth);
    });
  });

  describe('contaDoFirebase', () => {
    test('espera o login guardado voltar e devolve a conta', async () => {
      const auth = criarAuth();

      await expect(contaDoFirebase()).resolves.toEqual(USUARIO);

      expect(auth.authStateReady).toHaveBeenCalledTimes(1);
    });

    test('sem ninguém logado, devolve null', async () => {
      criarAuth(null);

      await expect(contaDoFirebase()).resolves.toBeNull();
    });
  });

  describe('alterarSenhaNoFirebase', () => {
    test('confirma a senha atual e só então troca pela nova', async () => {
      criarAuth();
      const passos: string[] = [];
      jest.mocked(reauthenticateWithCredential).mockImplementation(async () => {
        passos.push('reautenticar');
        return {} as never;
      });
      jest.mocked(updatePassword).mockImplementation(async () => {
        passos.push('trocar');
      });

      await alterarSenhaNoFirebase('Atual#123', 'Nova#12345');

      expect(EmailAuthProvider.credential).toHaveBeenCalledWith('ana@exemplo.com', 'Atual#123');
      expect(reauthenticateWithCredential).toHaveBeenCalledWith(USUARIO, CREDENCIAL);
      expect(updatePassword).toHaveBeenCalledWith(USUARIO, 'Nova#12345');
      expect(passos).toEqual(['reautenticar', 'trocar']);
    });

    test('com a senha atual errada, não troca nada', async () => {
      criarAuth();
      const erro = Object.assign(new Error('x'), { code: 'auth/invalid-credential' });
      jest.mocked(reauthenticateWithCredential).mockRejectedValue(erro);

      await expect(alterarSenhaNoFirebase('errada', 'Nova#12345')).rejects.toBe(erro);

      expect(updatePassword).not.toHaveBeenCalled();
    });

    test('sem conta logada, recusa antes de falar com o Firebase', async () => {
      criarAuth(null);

      await expect(alterarSenhaNoFirebase('Atual#123', 'Nova#12345')).rejects.toThrow(
        'Nenhuma conta logada no Firebase.',
      );
      expect(reauthenticateWithCredential).not.toHaveBeenCalled();
    });
  });

  describe('erros', () => {
    test.each([
      ['auth/email-already-in-use', 'Este e-mail já tem uma conta.'],
      ['auth/invalid-email', 'Digite um e-mail válido.'],
      ['auth/weak-password', 'A senha é fraca demais. Escolha uma mais forte.'],
      ['auth/invalid-credential', 'E-mail ou senha inválidos.'],
      ['auth/wrong-password', 'E-mail ou senha inválidos.'],
      ['auth/user-not-found', 'E-mail ou senha inválidos.'],
      ['auth/too-many-requests', 'Muitas tentativas. Tente de novo em alguns minutos.'],
      ['auth/network-request-failed', 'Sem conexão com a internet. Conecte-se para continuar.'],
      ['auth/user-disabled', 'Esta conta foi desativada.'],
      ['auth/requires-recent-login', 'Por segurança, entre de novo para fazer esta alteração.'],
      ['auth/operation-not-allowed', 'O login por e-mail e senha não está ativado no Firebase.'],
    ])('o código %s vira a mensagem em português', (codigo, mensagem) => {
      expect(mensagemDoErroDeAutenticacao(Object.assign(new Error('x'), { code: codigo }))).toBe(mensagem);
    });

    test('erro desconhecido ou que não é do Firebase não tem mensagem', () => {
      expect(mensagemDoErroDeAutenticacao(Object.assign(new Error('x'), { code: 'auth/outra-coisa' }))).toBeNull();
      expect(mensagemDoErroDeAutenticacao(new Error('sem código'))).toBeNull();
      expect(mensagemDoErroDeAutenticacao('texto')).toBeNull();
      expect(mensagemDoErroDeAutenticacao(null)).toBeNull();
    });

    test('lê o código do erro quando existe', () => {
      expect(codigoDoErroDeAutenticacao({ code: 'auth/x' })).toBe('auth/x');
      expect(codigoDoErroDeAutenticacao({ code: 5 })).toBeNull();
      expect(codigoDoErroDeAutenticacao(undefined)).toBeNull();
    });

    test.each(['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'])(
      '%s conta como senha ou e-mail errados',
      (codigo) => {
        expect(ehCredencialInvalida({ code: codigo })).toBe(true);
      },
    );

    test('outros erros não contam como credencial inválida', () => {
      expect(ehCredencialInvalida({ code: 'auth/network-request-failed' })).toBe(false);
      expect(ehCredencialInvalida(new Error('x'))).toBe(false);
    });
  });
});
