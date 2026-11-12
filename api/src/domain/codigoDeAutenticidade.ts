import { ValidationError } from './brand';

export type CampoDoCodigo = Readonly<{ chave: string; valor: string }>;

export type ConfereCarimbo = (mensagem: string, carimbo: string) => boolean;

export type ResultadoDoCodigoAntigo =
  | Readonly<{ tipo: 'autentico'; campos: readonly CampoDoCodigo[]; versaoMaisNova: boolean }>
  | Readonly<{ tipo: 'adulterado' }>
  | Readonly<{ tipo: 'ilegivel' }>;

export const VERSAO_DO_CODIGO = 1;

const PREFIXO_DA_VERSAO = /^AA([1-9]\d*)$/;
const CHAVE_DO_CAMPO = /^[a-z][A-Za-z0-9]*$/;
const SEPARADOR_DOS_CAMPOS = ';';
const SEPARADOR_DO_CARIMBO = '#';

export function serializarCampos(campos: readonly CampoDoCodigo[]): string {
  const chaves = new Set<string>();
  for (const { chave } of campos) {
    if (!CHAVE_DO_CAMPO.test(chave) || chaves.has(chave)) {
      throw new ValidationError(`Campo inválido no código de autenticidade: ${chave}`);
    }
    chaves.add(chave);
  }

  const pares = campos.map(({ chave, valor }) => `${chave}=${encodeURIComponent(valor)}`);
  return [`AA${VERSAO_DO_CODIGO}`, ...pares].join(SEPARADOR_DOS_CAMPOS);
}

function decodificar(valor: string): string {
  try {
    return decodeURIComponent(valor);
  } catch {
    return valor;
  }
}

function lerCampos(pares: readonly string[]): readonly CampoDoCodigo[] {
  return pares.map((par) => {
    const igual = par.indexOf('=');
    return igual < 0
      ? { chave: par, valor: '' }
      : { chave: par.slice(0, igual), valor: decodificar(par.slice(igual + 1)) };
  });
}

export function conferirCodigoAntigo(lido: string, confere: ConfereCarimbo): ResultadoDoCodigoAntigo {
  const texto = lido.trim();
  const separador = texto.lastIndexOf(SEPARADOR_DO_CARIMBO);
  if (separador < 0) {
    return { tipo: 'ilegivel' };
  }

  const mensagem = texto.slice(0, separador);
  const carimbo = texto.slice(separador + 1);
  const [prefixo = '', ...pares] = mensagem.split(SEPARADOR_DOS_CAMPOS);
  const versao = PREFIXO_DA_VERSAO.exec(prefixo);
  if (versao === null || carimbo === '') {
    return { tipo: 'ilegivel' };
  }
  if (!confere(mensagem, carimbo)) {
    return { tipo: 'adulterado' };
  }
  return { tipo: 'autentico', campos: lerCampos(pares), versaoMaisNova: Number(versao[1]) > VERSAO_DO_CODIGO };
}
