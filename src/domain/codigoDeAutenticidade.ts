import { ValidationError, type Brand } from './brand';
import { createIsoDateTime } from './dateTime';
import type { DocumentoAssinado } from './documento';
import { formatDateTime } from './format';
import type { Email } from './usuario';

export type CodigoDeAutenticidade = Brand<string, 'CodigoDeAutenticidade'>;

export type CampoDoCodigo = Readonly<{ chave: string; valor: string }>;

export type CampoExibido = Readonly<{ rotulo: string; valor: string }>;

export type Carimbar = (mensagem: string) => Promise<string>;

export type ResultadoDaValidacao =
  | Readonly<{ tipo: 'autentico'; campos: readonly CampoDoCodigo[]; versaoMaisNova: boolean }>
  | Readonly<{ tipo: 'adulterado' }>
  | Readonly<{ tipo: 'ilegivel' }>;

export const VERSAO_DO_CODIGO = 1;

const PREFIXO_DA_VERSAO = /^AA([1-9]\d*)$/;
const CHAVE_DO_CAMPO = /^[a-z][A-Za-z0-9]*$/;
const SEPARADOR_DOS_CAMPOS = ';';
const SEPARADOR_DO_CARIMBO = '#';

const ROTULOS = new Map<string, string>([
  ['titulo', 'Título'],
  ['email', 'Assinado por'],
  ['em', 'Assinado em'],
  ['local', 'Local'],
  ['id', 'Documento'],
]);

const CAMPOS_INTERNOS = new Set(['foto']);

export function camposDoDocumento(
  documento: DocumentoAssinado,
  email: Email,
  resumoDaFoto: string,
): readonly CampoDoCodigo[] {
  const { latitude, longitude } = documento.local.coordenadas;

  return [
    { chave: 'id', valor: documento.id },
    { chave: 'email', valor: email },
    { chave: 'titulo', valor: documento.titulo },
    { chave: 'em', valor: documento.assinadoEm },
    { chave: 'local', valor: `${latitude},${longitude}` },
    { chave: 'foto', valor: resumoDaFoto },
  ];
}

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

export async function emitirCodigo(
  campos: readonly CampoDoCodigo[],
  carimbar: Carimbar,
): Promise<CodigoDeAutenticidade> {
  const mensagem = serializarCampos(campos);
  return `${mensagem}${SEPARADOR_DO_CARIMBO}${await carimbar(mensagem)}` as CodigoDeAutenticidade;
}

function mesmoCarimbo(esperado: string, recebido: string): boolean {
  if (esperado.length !== recebido.length) {
    return false;
  }
  let diferenca = 0;
  for (let indice = 0; indice < esperado.length; indice += 1) {
    diferenca |= esperado.charCodeAt(indice) ^ recebido.charCodeAt(indice);
  }
  return diferenca === 0;
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

export async function validarCodigo(lido: string, carimbar: Carimbar): Promise<ResultadoDaValidacao> {
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
  if (!mesmoCarimbo(await carimbar(mensagem), carimbo)) {
    return { tipo: 'adulterado' };
  }
  return { tipo: 'autentico', campos: lerCampos(pares), versaoMaisNova: Number(versao[1]) > VERSAO_DO_CODIGO };
}

function valorExibido({ chave, valor }: CampoDoCodigo): string {
  if (chave === 'em') {
    try {
      return formatDateTime(createIsoDateTime(valor));
    } catch {
      return valor;
    }
  }
  return chave === 'local' ? valor.replace(',', ', ') : valor;
}

export function camposParaExibir(campos: readonly CampoDoCodigo[]): readonly CampoExibido[] {
  const visiveis = campos.filter(({ chave }) => !CAMPOS_INTERNOS.has(chave));
  const conhecidos = [...ROTULOS.keys()].flatMap((chave) => visiveis.filter((campo) => campo.chave === chave));
  const desconhecidos = visiveis.filter(({ chave }) => !ROTULOS.has(chave));

  return [...conhecidos, ...desconhecidos].map((campo) => ({
    rotulo: ROTULOS.get(campo.chave) ?? campo.chave,
    valor: valorExibido(campo),
  }));
}
