import { ValidationError, type Brand } from './brand';

// Endereço aproximado de onde o documento foi assinado, montado pela consulta das coordenadas do GPS.
export type Endereco = Brand<string, 'Endereco'>;

export const TAMANHO_MAXIMO_DO_ENDERECO = 200;

// O que a consulta pelas coordenadas devolve, já com os nomes daqui. Qualquer parte pode faltar.
export type PartesDoEndereco = Readonly<{
  rua: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  // O Android às vezes traz o endereço já formatado; serve quando as partes não vêm.
  enderecoPronto: string | null;
}>;

export function createEndereco(texto: string): Endereco {
  const endereco = texto.trim();
  if (endereco.length === 0 || endereco.length > TAMANHO_MAXIMO_DO_ENDERECO) {
    throw new ValidationError('Endereço inválido.');
  }
  return endereco as Endereco;
}

function limpo(parte: string | null): string | null {
  const texto = parte?.trim() ?? '';
  return texto === '' ? null : texto;
}

function juntar(partes: readonly (string | null)[], separador: string): string | null {
  const presentes = partes.filter((parte): parte is string => parte !== null);
  return presentes.length === 0 ? null : presentes.join(separador);
}

// Formato brasileiro: "Rua das Flores, 123 - Centro, Vassouras - RJ, 27700-000". O número só entra com a rua.
export function montarEndereco(partes: PartesDoEndereco): Endereco | null {
  const rua = limpo(partes.rua);
  const ruaComNumero = rua === null ? null : juntar([rua, limpo(partes.numero)], ', ');
  const comeco = juntar([ruaComNumero, limpo(partes.bairro)], ' - ');
  const cidadeComEstado = juntar([limpo(partes.cidade), limpo(partes.estado)], ' - ');
  const montado = juntar([comeco, cidadeComEstado, limpo(partes.cep)], ', ') ?? limpo(partes.enderecoPronto);
  return montado === null ? null : createEndereco(montado.slice(0, TAMANHO_MAXIMO_DO_ENDERECO));
}
