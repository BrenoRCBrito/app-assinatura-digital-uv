import { ValidationError, type Brand } from './brand';

export type CodigoCurto = Brand<string, 'CodigoCurto'>;

export const BYTES_DO_CODIGO_CURTO = 8;

const ALFABETO = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const SIMBOLOS = 12;
const TAMANHO_DO_GRUPO = 4;
const BITS_POR_SIMBOLO = 5;
const LEITURAS_TROCADAS: Readonly<Record<string, string>> = { O: '0', I: '1', L: '1' };

export function criarCodigoCurto(texto: string): CodigoCurto {
  const codigo = texto
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/[OIL]/g, (letra) => LEITURAS_TROCADAS[letra]);
  if (codigo.length !== SIMBOLOS || [...codigo].some((simbolo) => !ALFABETO.includes(simbolo))) {
    throw new ValidationError('Código do documento inválido.');
  }
  return codigo as CodigoCurto;
}

export function formatarCodigoCurto(codigo: CodigoCurto): string {
  const grupos: string[] = [];
  for (let inicio = 0; inicio < codigo.length; inicio += TAMANHO_DO_GRUPO) {
    grupos.push(codigo.slice(inicio, inicio + TAMANHO_DO_GRUPO));
  }
  return grupos.join('-');
}

export function codigoCurtoDeBytes(bytes: Uint8Array): CodigoCurto {
  if (bytes.length < BYTES_DO_CODIGO_CURTO) {
    throw new ValidationError(`São precisos ${BYTES_DO_CODIGO_CURTO} bytes para gerar um código.`);
  }
  let codigo = '';
  let acumulado = 0;
  let bitsGuardados = 0;
  for (const byte of bytes.subarray(0, BYTES_DO_CODIGO_CURTO)) {
    acumulado = (acumulado << 8) | byte;
    bitsGuardados += 8;
    while (bitsGuardados >= BITS_POR_SIMBOLO && codigo.length < SIMBOLOS) {
      bitsGuardados -= BITS_POR_SIMBOLO;
      codigo += ALFABETO[(acumulado >> bitsGuardados) & 0b11111];
    }
    acumulado &= (1 << bitsGuardados) - 1;
  }
  return codigo as CodigoCurto;
}
