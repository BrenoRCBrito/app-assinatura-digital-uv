import { createIsoDateTime } from './dateTime';
import { createLatitude, createLongitude, type Coordinates, type DocumentoAssinado } from './documento';
import { formatDateTime } from './format';
import type { Cpf, Telefone, Usuario } from './usuario';

export type CampoDoCodigo = Readonly<{ chave: string; valor: string }>;

export type CampoExibido = Readonly<{ rotulo: string; valor: string }>;

export type TitularDoCodigo = Pick<Usuario, 'email' | 'cpf' | 'telefone'>;

export type ResultadoDaValidacao =
  | Readonly<{ tipo: 'autentico'; campos: readonly CampoDoCodigo[]; versaoMaisNova: boolean }>
  | Readonly<{ tipo: 'adulterado' }>
  | Readonly<{ tipo: 'naoEncontrado' }>
  | Readonly<{ tipo: 'ilegivel' }>;

const ROTULOS = new Map<string, string>([
  ['titulo', 'Título'],
  ['email', 'Assinado por'],
  ['cpf', 'CPF'],
  ['telefone', 'Telefone'],
  ['em', 'Assinado em'],
  ['local', 'Local'],
  ['id', 'Documento'],
]);

const CAMPOS_INTERNOS = new Set(['foto']);

const COORDENADAS = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/;

function mascararCpf(cpf: Cpf): string {
  return `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**`;
}

function mascararTelefone(telefone: Telefone): string {
  return `(**) ${'*'.repeat(telefone.length - 6)}-${telefone.slice(-4)}`;
}

export function camposDoDocumento(
  documento: DocumentoAssinado,
  titular: TitularDoCodigo,
  resumoDaFoto: string,
): readonly CampoDoCodigo[] {
  const { latitude, longitude } = documento.local.coordenadas;

  return [
    { chave: 'id', valor: documento.id },
    { chave: 'email', valor: titular.email },
    ...(titular.cpf === null ? [] : [{ chave: 'cpf', valor: mascararCpf(titular.cpf) }]),
    ...(titular.telefone === null ? [] : [{ chave: 'telefone', valor: mascararTelefone(titular.telefone) }]),
    { chave: 'titulo', valor: documento.titulo },
    { chave: 'em', valor: documento.assinadoEm },
    { chave: 'local', valor: `${latitude},${longitude}` },
    { chave: 'foto', valor: resumoDaFoto },
  ];
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

export function coordenadasDoCodigo(campos: readonly CampoDoCodigo[]): Coordinates | null {
  const local = campos.find(({ chave }) => chave === 'local');
  const partes = local === undefined ? null : COORDENADAS.exec(local.valor);
  if (partes === null) {
    return null;
  }
  try {
    return { latitude: createLatitude(Number(partes[1])), longitude: createLongitude(Number(partes[2])) };
  } catch {
    return null;
  }
}
