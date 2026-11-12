import { ValidationError, type Brand } from './brand';

export type CodigoCurto = Brand<string, 'CodigoCurto'>;

const ALFABETO = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const SIMBOLOS = 12;
const TAMANHO_DO_GRUPO = 4;
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
