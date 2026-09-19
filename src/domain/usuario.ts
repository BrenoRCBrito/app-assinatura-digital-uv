import { ValidationError, type Brand } from './brand';
import { createIsoDateTime, type IsoDateTime } from './dateTime';
import { lerObjeto, lerTexto } from './leitura';

export type UsuarioId = Brand<string, 'UsuarioId'>;
export type Email = Brand<string, 'Email'>;

export type Usuario = Readonly<{
  id: UsuarioId;
  email: Email;
  senhaHash: string;
  criadoEm: IsoDateTime;
}>;

export type RequisitoSenha = Readonly<{
  chave: string;
  label: string;
  atendido: (senha: string) => boolean;
}>;

export const REQUISITOS_SENHA: readonly RequisitoSenha[] = [
  { chave: 'tamanho', label: 'Mínimo de 8 caracteres', atendido: (senha) => senha.length >= 8 },
  { chave: 'maiuscula', label: 'Pelo menos 1 letra maiúscula', atendido: (senha) => /[A-Z]/.test(senha) },
  { chave: 'minuscula', label: 'Pelo menos 1 letra minúscula', atendido: (senha) => /[a-z]/.test(senha) },
  { chave: 'especial', label: 'Pelo menos 1 caractere especial', atendido: (senha) => /[^A-Za-z0-9]/.test(senha) },
];

const USUARIO_ID = /^\d+$/;
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USUARIO_INVALIDO = 'Usuário salvo inválido.';

export function criarUsuarioId(texto: string = Date.now().toString()): UsuarioId {
  if (!USUARIO_ID.test(texto)) {
    throw new ValidationError(`Id de usuário inválido: ${texto}`);
  }
  return texto as UsuarioId;
}

export function criarEmail(texto: string): Email {
  const email = texto.trim().toLowerCase();
  if (!EMAIL_VALIDO.test(email)) {
    throw new ValidationError('Digite um e-mail válido.');
  }
  return email as Email;
}

export function validarSenha(senha: string): readonly string[] {
  return REQUISITOS_SENHA.filter((requisito) => !requisito.atendido(senha)).map((requisito) => requisito.label);
}

export function paraUsuario(dado: unknown): Usuario {
  const usuario = lerObjeto(dado, USUARIO_INVALIDO);

  return {
    id: criarUsuarioId(lerTexto('id' in usuario ? usuario.id : undefined, USUARIO_INVALIDO)),
    email: criarEmail(lerTexto('email' in usuario ? usuario.email : undefined, USUARIO_INVALIDO)),
    senhaHash: lerTexto('senhaHash' in usuario ? usuario.senhaHash : undefined, USUARIO_INVALIDO),
    criadoEm: createIsoDateTime(
      lerTexto('criadoEm' in usuario ? usuario.criadoEm : undefined, USUARIO_INVALIDO),
    ),
  };
}
