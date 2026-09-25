import { ValidationError, type Brand } from './brand';
import { createIsoDateTime, type IsoDateTime } from './dateTime';
import { lerObjeto, lerTexto, lerTextoOuNulo } from './leitura';

export type UsuarioId = Brand<string, 'UsuarioId'>;
export type Email = Brand<string, 'Email'>;
export type Cpf = Brand<string, 'Cpf'>;
export type Telefone = Brand<string, 'Telefone'>;
export type FotoPerfil = Brand<string, 'FotoPerfil'>;

export type Usuario = Readonly<{
  id: UsuarioId;
  email: Email;
  senhaHash: string;
  cpf: Cpf | null;
  telefone: Telefone | null;
  foto: FotoPerfil | null;
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
const CPF_DIGITOS = /^\d{11}$/;

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

function digitoVerificadorCpf(numeros: string, pesoInicial: number): number {
  const soma = numeros
    .split('')
    .reduce((total, digito, indice) => total + Number(digito) * (pesoInicial - indice), 0);
  const resto = (soma * 10) % 11;
  return resto === 10 ? 0 : resto;
}

export function criarCpf(texto: string): Cpf {
  const numeros = texto.replace(/\D/g, '');
  if (!CPF_DIGITOS.test(numeros) || new Set(numeros).size === 1) {
    throw new ValidationError('Digite um CPF válido.');
  }
  const digito1 = digitoVerificadorCpf(numeros.slice(0, 9), 10);
  const digito2 = digitoVerificadorCpf(numeros.slice(0, 9) + digito1, 11);
  if (numeros.slice(9) !== `${digito1}${digito2}`) {
    throw new ValidationError('Digite um CPF válido.');
  }
  return numeros as Cpf;
}

export function formatarCpf(cpf: Cpf): string {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

const TELEFONE_DIGITOS = /^\d{10,11}$/;

export function criarTelefone(texto: string): Telefone {
  const numeros = texto.replace(/\D/g, '');
  if (!TELEFONE_DIGITOS.test(numeros)) {
    throw new ValidationError('Digite um telefone válido, com DDD.');
  }
  return numeros as Telefone;
}

export function formatarTelefone(telefone: Telefone): string {
  return telefone.length === 11
    ? telefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    : telefone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
}

export function criarFotoPerfil(base64: string): FotoPerfil {
  if (base64.trim() === '') {
    throw new ValidationError('Foto de perfil vazia.');
  }
  return base64 as FotoPerfil;
}



export function paraUsuario(dado: unknown): Usuario {
  const usuario = lerObjeto(dado, USUARIO_INVALIDO);
  const cpfBruto = lerTextoOuNulo('cpf' in usuario ? usuario.cpf : undefined, USUARIO_INVALIDO);
  const telefoneBruto = lerTextoOuNulo('telefone' in usuario ? usuario.telefone : undefined, USUARIO_INVALIDO);
  const fotoBruta = lerTextoOuNulo('foto' in usuario ? usuario.foto : undefined, USUARIO_INVALIDO); // ADICIONAR

  return {
    id: criarUsuarioId(lerTexto('id' in usuario ? usuario.id : undefined, USUARIO_INVALIDO)),
    email: criarEmail(lerTexto('email' in usuario ? usuario.email : undefined, USUARIO_INVALIDO)),
    senhaHash: lerTexto('senhaHash' in usuario ? usuario.senhaHash : undefined, USUARIO_INVALIDO),
    cpf: cpfBruto === null ? null : criarCpf(cpfBruto),
    telefone: telefoneBruto === null ? null : criarTelefone(telefoneBruto),
    foto: fotoBruta === null ? null : criarFotoPerfil(fotoBruta),  // ADICIONAR
    criadoEm: createIsoDateTime(
      lerTexto('criadoEm' in usuario ? usuario.criadoEm : undefined, USUARIO_INVALIDO),
    ),
  };
}

