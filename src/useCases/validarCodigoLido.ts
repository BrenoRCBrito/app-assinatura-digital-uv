import { ValidationError } from '../domain/brand';
import { criarCodigoCurto, type CodigoCurto } from '../domain/codigoCurto';
import type { ResultadoDaValidacao } from '../domain/codigoDeAutenticidade';

export type DependenciasDaValidacao = Readonly<{
  consultarCodigo: (codigo: CodigoCurto) => Promise<ResultadoDaValidacao>;
  conferirCodigoAntigo: (texto: string) => Promise<ResultadoDaValidacao>;
}>;

const CODIGO_COMPLETO = /^AA\d+;/;

function lerCodigoCurto(texto: string): CodigoCurto | null {
  try {
    return criarCodigoCurto(texto);
  } catch (error) {
    if (error instanceof ValidationError) {
      return null;
    }
    throw error;
  }
}

export async function validarCodigoLido(
  dependencias: DependenciasDaValidacao,
  lido: string,
): Promise<ResultadoDaValidacao> {
  const texto = lido.trim();
  if (CODIGO_COMPLETO.test(texto)) {
    return dependencias.conferirCodigoAntigo(texto);
  }
  const codigo = lerCodigoCurto(texto);
  return codigo === null ? { tipo: 'ilegivel' } : dependencias.consultarCodigo(codigo);
}
