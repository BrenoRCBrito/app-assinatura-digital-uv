import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  verifyBeforeUpdateEmail,
  type User,
} from 'firebase/auth';

import { obterAuth } from './firebase';

export type ContaFirebase = Readonly<{ uid: string; email: string }>;

const SEM_CONTA = 'Nenhuma conta logada no Firebase.';

const MENSAGENS: Readonly<Record<string, string>> = {
  'auth/email-already-in-use': 'Este e-mail já tem uma conta.',
  'auth/invalid-email': 'Digite um e-mail válido.',
  'auth/weak-password': 'A senha é fraca demais. Escolha uma mais forte.',
  'auth/invalid-credential': 'E-mail ou senha inválidos.',
  'auth/wrong-password': 'E-mail ou senha inválidos.',
  'auth/user-not-found': 'E-mail ou senha inválidos.',
  'auth/too-many-requests': 'Muitas tentativas. Tente de novo em alguns minutos.',
  'auth/network-request-failed': 'Sem conexão com a internet. Conecte-se para continuar.',
  'auth/user-disabled': 'Esta conta foi desativada.',
  'auth/requires-recent-login': 'Por segurança, entre de novo para fazer esta alteração.',
  'auth/operation-not-allowed': 'O login por e-mail e senha não está ativado no Firebase.',
};

const CREDENCIAL_INVALIDA = ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'];

function paraConta(usuario: User): ContaFirebase {
  if (usuario.email === null) {
    throw new Error('A conta do Firebase não tem e-mail.');
  }
  return { uid: usuario.uid, email: usuario.email };
}

function contaLogada(): User {
  const usuario = obterAuth().currentUser;
  if (usuario === null) {
    throw new Error(SEM_CONTA);
  }
  return usuario;
}

async function reautenticar(senhaAtual: string): Promise<User> {
  const usuario = contaLogada();
  if (usuario.email === null) {
    throw new Error('A conta do Firebase não tem e-mail.');
  }
  await reauthenticateWithCredential(usuario, EmailAuthProvider.credential(usuario.email, senhaAtual));
  return usuario;
}

export async function cadastrarNoFirebase(email: string, senha: string): Promise<ContaFirebase> {
  const { user } = await createUserWithEmailAndPassword(obterAuth(), email, senha);
  return paraConta(user);
}

export async function entrarNoFirebase(email: string, senha: string): Promise<ContaFirebase> {
  const { user } = await signInWithEmailAndPassword(obterAuth(), email, senha);
  return paraConta(user);
}

export async function sairDoFirebase(): Promise<void> {
  await signOut(obterAuth());
}

export async function contaDoFirebase(): Promise<ContaFirebase | null> {
  const auth = obterAuth();
  await auth.authStateReady();
  return auth.currentUser === null ? null : paraConta(auth.currentUser);
}

export async function alterarSenhaNoFirebase(senhaAtual: string, novaSenha: string): Promise<void> {
  await updatePassword(await reautenticar(senhaAtual), novaSenha);
}

export async function pedirTrocaDeEmailNoFirebase(senhaAtual: string, novoEmail: string): Promise<void> {
  await verifyBeforeUpdateEmail(await reautenticar(senhaAtual), novoEmail);
}

export function codigoDoErroDeAutenticacao(error: unknown): string | null {
  const codigo = typeof error === 'object' && error !== null ? (error as { code?: unknown }).code : undefined;
  return typeof codigo === 'string' ? codigo : null;
}

export function mensagemDoErroDeAutenticacao(error: unknown): string | null {
  const codigo = codigoDoErroDeAutenticacao(error);
  return codigo === null ? null : (MENSAGENS[codigo] ?? null);
}

export function ehCredencialInvalida(error: unknown): boolean {
  const codigo = codigoDoErroDeAutenticacao(error);
  return codigo !== null && CREDENCIAL_INVALIDA.includes(codigo);
}
