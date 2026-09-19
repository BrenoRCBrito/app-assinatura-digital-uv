import { criarNomeAssinatura, type NomeAssinatura } from './assinatura';
import { ValidationError, type Brand } from './brand';
import { createIsoDateTime, type IsoDateTime } from './dateTime';
import { paraDesenho, type Desenho } from './desenho';
import { createFraction, paraSize, type Size } from './geometry';
import { lerNumero, lerObjeto, lerTexto } from './leitura';
import type { PosicaoSelo } from './selo';
import { criarUsuarioId, type UsuarioId } from './usuario';


export type DocumentoId = Brand<string, 'DocumentoId'>;
export type TituloDocumento = Brand<string, 'TituloDocumento'>;
export type Latitude = Brand<number, 'Latitude'>;
export type Longitude = Brand<number, 'Longitude'>;
export type City = Brand<string, 'City'>;
export type Base64 = Brand<string, 'Base64'>;
export type Html = Brand<string, 'Html'>;

export type Coordinates = Readonly<{ latitude: Latitude; longitude: Longitude }>;

export type LocalAssinatura = Readonly<{ coordenadas: Coordinates; cidade: City | null }>;

export type AssinaturaUsada = Readonly<{ nome: NomeAssinatura; desenho: Desenho }>;

export type DocumentoAssinado = Readonly<{
  id: DocumentoId;
  usuarioId: UsuarioId;
  titulo: TituloDocumento;
  assinaturaUsada: AssinaturaUsada;
  tamanhoFoto: Size;
  selo: PosicaoSelo;
  local: LocalAssinatura;
  assinadoEm: IsoDateTime;
}>;

const DOCUMENTO_ID = /^\d+$/;
const TAMANHO_MAXIMO_DO_TITULO = 60;
const DOCTYPE = '<!DOCTYPE html>';
const DOCUMENTO_INVALIDO = 'Documento salvo inválido.';

export function criarDocumentoId(texto: string = Date.now().toString()): DocumentoId {
  if (!DOCUMENTO_ID.test(texto)) {
    throw new ValidationError(`Id de documento inválido: ${texto}`);
  }
  return texto as DocumentoId;
}

export function criarTituloDocumento(texto: string): TituloDocumento {
  const titulo = texto.trim();
  if (titulo.length === 0) {
    throw new ValidationError('Dê um título ao documento.');
  }
  if (titulo.length > TAMANHO_MAXIMO_DO_TITULO) {
    throw new ValidationError(`O título do documento tem no máximo ${TAMANHO_MAXIMO_DO_TITULO} caracteres.`);
  }
  return titulo as TituloDocumento;
}

export function createLatitude(value: number): Latitude {
  if (!Number.isFinite(value) || value < -90 || value > 90) {
    throw new ValidationError(`Latitude inválida: ${value}`);
  }
  return value as Latitude;
}

export function createLongitude(value: number): Longitude {
  if (!Number.isFinite(value) || value < -180 || value > 180) {
    throw new ValidationError(`Longitude inválida: ${value}`);
  }
  return value as Longitude;
}

export function createCity(text: string): City {
  const city = text.trim();
  if (city.length === 0) {
    throw new ValidationError('Cidade vazia.');
  }
  return city as City;
}

export function createBase64(text: string): Base64 {
  if (text.length === 0) {
    throw new ValidationError('Base64 vazio.');
  }
  return text as Base64;
}

export function createHtml(text: string): Html {
  if (!text.startsWith(DOCTYPE)) {
    throw new ValidationError('HTML sem DOCTYPE.');
  }
  return text as Html;
}

export function ordenarDocumentosMaisNovosPrimeiro(
  documentos: readonly DocumentoAssinado[],
): readonly DocumentoAssinado[] {
  return [...documentos].sort((a, b) => {
    if (a.assinadoEm === b.assinadoEm) {
      return 0;
    }
    return a.assinadoEm < b.assinadoEm ? 1 : -1;
  });
}

function paraAssinaturaUsada(dado: unknown): AssinaturaUsada {
  const assinatura = lerObjeto(dado, DOCUMENTO_INVALIDO);

  return {
    nome: criarNomeAssinatura(lerTexto('nome' in assinatura ? assinatura.nome : undefined, DOCUMENTO_INVALIDO)),
    desenho: paraDesenho('desenho' in assinatura ? assinatura.desenho : undefined, DOCUMENTO_INVALIDO),
  };
}

function paraSelo(dado: unknown): PosicaoSelo {
  const selo = lerObjeto(dado, DOCUMENTO_INVALIDO);

  return {
    x: createFraction(lerNumero('x' in selo ? selo.x : undefined, DOCUMENTO_INVALIDO)),
    y: createFraction(lerNumero('y' in selo ? selo.y : undefined, DOCUMENTO_INVALIDO)),
    largura: createFraction(lerNumero('largura' in selo ? selo.largura : undefined, DOCUMENTO_INVALIDO)),
  };
}

function paraLocal(dado: unknown): LocalAssinatura {
  const local = lerObjeto(dado, DOCUMENTO_INVALIDO);
  const coordenadas = lerObjeto('coordenadas' in local ? local.coordenadas : undefined, DOCUMENTO_INVALIDO);
  const cidade = 'cidade' in local ? local.cidade : undefined;

  return {
    coordenadas: {
      latitude: createLatitude(
        lerNumero('latitude' in coordenadas ? coordenadas.latitude : undefined, DOCUMENTO_INVALIDO),
      ),
      longitude: createLongitude(
        lerNumero('longitude' in coordenadas ? coordenadas.longitude : undefined, DOCUMENTO_INVALIDO),
      ),
    },
    cidade: cidade === null ? null : createCity(lerTexto(cidade, DOCUMENTO_INVALIDO)),
  };
}

export function paraDocumentoAssinado(dado: unknown): DocumentoAssinado {
  const documento = lerObjeto(dado, DOCUMENTO_INVALIDO);

  return {
    id: criarDocumentoId(lerTexto('id' in documento ? documento.id : undefined, DOCUMENTO_INVALIDO)),
    usuarioId: criarUsuarioId(
      lerTexto('usuarioId' in documento ? documento.usuarioId : undefined, DOCUMENTO_INVALIDO),
    ),
    titulo: criarTituloDocumento(lerTexto('titulo' in documento ? documento.titulo : undefined, DOCUMENTO_INVALIDO)),
    assinaturaUsada: paraAssinaturaUsada('assinaturaUsada' in documento ? documento.assinaturaUsada : undefined),
    tamanhoFoto: paraSize('tamanhoFoto' in documento ? documento.tamanhoFoto : undefined, DOCUMENTO_INVALIDO),
    selo: paraSelo('selo' in documento ? documento.selo : undefined),
    local: paraLocal('local' in documento ? documento.local : undefined),
    assinadoEm: createIsoDateTime(
      lerTexto('assinadoEm' in documento ? documento.assinadoEm : undefined, DOCUMENTO_INVALIDO),
    ),
  };
}

