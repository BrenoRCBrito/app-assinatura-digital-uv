import Constants from 'expo-constants';

import { criarCodigoCurto, formatarCodigoCurto, type CodigoCurto } from '../domain/codigoCurto';
import type { CampoDoCodigo, ResultadoDaValidacao } from '../domain/codigoDeAutenticidade';
import type { EnderecoDaApi } from '../domain/enderecoDaApi';
import { lerLista, lerObjeto, lerTexto } from '../domain/leitura';

const PORTA_DA_API = 3000;
const TEMPO_LIMITE_MS = 8000;
const RESPOSTA_INVALIDA = 'Resposta inesperada da API.';

export class ServidorIndisponivel extends Error {
  constructor(opcoes?: Readonly<{ cause?: unknown }>) {
    super('O servidor do AssinaAqui não respondeu.', opcoes);
    this.name = 'ServidorIndisponivel';
  }
}

// O endereço das Configurações vence o do build e o do Metro; o hook useEnderecoDaApi mantém esta variável em dia.
let enderecoConfigurado: EnderecoDaApi | null = null;

export function definirEnderecoConfigurado(endereco: EnderecoDaApi | null): void {
  enderecoConfigurado = endereco;
}

export function enderecoAutomatico(): string | null {
  const doBuild: unknown = Constants.expoConfig?.extra?.apiUrl;
  if (typeof doBuild === 'string' && doBuild.trim() !== '') {
    return doBuild.trim().replace(/\/+$/, '');
  }
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return host === undefined || host === '' ? null : `http://${host}:${PORTA_DA_API}`;
}

export function enderecoDaApi(): string {
  const endereco = enderecoConfigurado ?? enderecoAutomatico();
  if (endereco === null) {
    throw new ServidorIndisponivel();
  }
  return endereco;
}

async function requisitar(caminho: string, opcoes: RequestInit = {}): Promise<Response> {
  const controle = new AbortController();
  const limite = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  try {
    return await fetch(`${enderecoDaApi()}${caminho}`, { ...opcoes, signal: controle.signal });
  } catch (error) {
    throw new ServidorIndisponivel({ cause: error });
  } finally {
    clearTimeout(limite);
  }
}

function enviarJson(caminho: string, corpo: unknown): Promise<Response> {
  return requisitar(caminho, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });
}

async function lerCorpo(resposta: Response): Promise<object> {
  return lerObjeto(await resposta.json(), RESPOSTA_INVALIDA);
}

function lerCamposDaResposta(dado: unknown): readonly CampoDoCodigo[] {
  return lerLista(dado, RESPOSTA_INVALIDA).map((item) => {
    const campo = lerObjeto(item, RESPOSTA_INVALIDA);
    return {
      chave: lerTexto('chave' in campo ? campo.chave : undefined, RESPOSTA_INVALIDA),
      valor: lerTexto('valor' in campo ? campo.valor : undefined, RESPOSTA_INVALIDA),
    };
  });
}

function lerVeredicto(corpo: object): ResultadoDaValidacao {
  const veredicto = 'veredicto' in corpo ? corpo.veredicto : undefined;
  if (veredicto === 'autentico') {
    return {
      tipo: 'autentico',
      campos: lerCamposDaResposta('campos' in corpo ? corpo.campos : undefined),
      versaoMaisNova: 'versaoMaisNova' in corpo && corpo.versaoMaisNova === true,
    };
  }
  if (veredicto === 'adulterado' || veredicto === 'ilegivel') {
    return { tipo: veredicto };
  }
  throw new Error(RESPOSTA_INVALIDA);
}

export async function registrarDocumento(campos: readonly CampoDoCodigo[]): Promise<CodigoCurto> {
  const resposta = await enviarJson('/documentos', { campos });
  if (resposta.status !== 201) {
    throw new Error(`A API recusou o documento (HTTP ${resposta.status}).`);
  }
  const corpo = await lerCorpo(resposta);
  return criarCodigoCurto(lerTexto('codigo' in corpo ? corpo.codigo : undefined, RESPOSTA_INVALIDA));
}

export async function consultarCodigo(codigo: CodigoCurto): Promise<ResultadoDaValidacao> {
  const resposta = await requisitar(`/documentos/${formatarCodigoCurto(codigo)}`);
  if (resposta.status === 404) {
    return { tipo: 'naoEncontrado' };
  }
  if (resposta.status !== 200) {
    throw new Error(`A API não conferiu o código (HTTP ${resposta.status}).`);
  }
  return lerVeredicto(await lerCorpo(resposta));
}

export async function conferirCodigoAntigo(texto: string): Promise<ResultadoDaValidacao> {
  const resposta = await enviarJson('/validacoes', { codigo: texto });
  if (resposta.status !== 200) {
    throw new Error(`A API não conferiu o código (HTTP ${resposta.status}).`);
  }
  return lerVeredicto(await lerCorpo(resposta));
}
