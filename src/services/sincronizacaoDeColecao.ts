import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';

import type { UsuarioId } from '../domain/usuario';
import type {
  ColecaoSincronizada,
  CursorDeSincronizacao,
  CursorRepository,
  RegistroSincronizavel,
  Sincronizavel,
} from '../storage/repositories';
import { obterFirestore } from './firebase';
import { comTempoLimite } from './tempoLimite';

type ComId = Readonly<{ id: string }>;

export type AdaptadorDeColecao<T extends ComId> = Readonly<{
  colecao: ColecaoSincronizada;
  repositorio: Sincronizavel<T>;
  paraNuvem: (registro: RegistroSincronizavel<T>) => Readonly<Record<string, unknown>>;
  daNuvem: (id: string, usuarioId: UsuarioId, dados: unknown) => RegistroSincronizavel<T>;
}>;

export type ResultadoDaColecao = Readonly<{ enviados: number; baixados: number; falhas: number }>;

export const TAMANHO_DA_PAGINA = 100;
export const TEMPO_LIMITE_DA_GRAVACAO = 15000;

function lerMarcador(dados: unknown): CursorDeSincronizacao | null {
  if (typeof dados !== 'object' || dados === null || !('servidorEm' in dados)) {
    return null;
  }
  const marcador = dados.servidorEm;
  if (
    typeof marcador === 'object' &&
    marcador !== null &&
    'seconds' in marcador &&
    'nanoseconds' in marcador &&
    typeof marcador.seconds === 'number' &&
    typeof marcador.nanoseconds === 'number'
  ) {
    return { segundos: marcador.seconds, nanos: marcador.nanoseconds };
  }
  return null;
}

function lerRegistroDaNuvem<T extends ComId>(
  adaptador: AdaptadorDeColecao<T>,
  usuarioId: UsuarioId,
  id: string,
  dados: unknown,
): RegistroSincronizavel<T> | null {
  try {
    return adaptador.daNuvem(id, usuarioId, dados);
  } catch (error) {
    console.warn(`Documento ${id} da coleção ${adaptador.colecao} ignorado, formato inválido:`, error);
    return null;
  }
}

async function aplicarSeForMaisNovo<T extends ComId>(
  repositorio: Sincronizavel<T>,
  registro: RegistroSincronizavel<T>,
): Promise<boolean> {
  const { id } = registro.item;
  const local = await repositorio.lerParaSincronizar(id);
  if (local === null || registro.updatedAt > local.registro.updatedAt) {
    await repositorio.aplicarDaNuvem(registro);
    return true;
  }
  if (registro.updatedAt === local.registro.updatedAt && local.pendente) {
    await repositorio.marcarSincronizado(id, local.registro.updatedAt);
  }
  return false;
}

export async function sincronizarColecao<T extends ComId>(
  adaptador: AdaptadorDeColecao<T>,
  cursores: CursorRepository,
  usuarioId: UsuarioId,
): Promise<ResultadoDaColecao> {
  const colecao = collection(obterFirestore(), 'usuarios', usuarioId, adaptador.colecao);
  let baixados = 0;
  let enviados = 0;
  let falhas = 0;

  let cursor = await cursores.ler(usuarioId, adaptador.colecao);
  for (;;) {
    const filtros = cursor === null ? [] : [where('servidorEm', '>', new Timestamp(cursor.segundos, cursor.nanos))];
    const pagina = await getDocs(query(colecao, ...filtros, orderBy('servidorEm'), limit(TAMANHO_DA_PAGINA)));

    for (const documento of pagina.docs) {
      const dados: unknown = documento.data();
      const registro = lerRegistroDaNuvem(adaptador, usuarioId, documento.id, dados);
      if (registro === null) {
        falhas += 1;
      } else if (await aplicarSeForMaisNovo(adaptador.repositorio, registro)) {
        baixados += 1;
      }
      cursor = lerMarcador(dados) ?? cursor;
    }

    if (pagina.docs.length > 0 && cursor !== null) {
      await cursores.gravar(usuarioId, adaptador.colecao, cursor);
    }
    if (pagina.docs.length < TAMANHO_DA_PAGINA) {
      break;
    }
  }

  for (const registro of await adaptador.repositorio.listarPendentes(usuarioId)) {
    const { id } = registro.item;
    try {
      await comTempoLimite(
        setDoc(doc(colecao, id), { ...adaptador.paraNuvem(registro), servidorEm: serverTimestamp() }),
        TEMPO_LIMITE_DA_GRAVACAO,
        'A gravação na nuvem demorou demais.',
      );
      await adaptador.repositorio.marcarSincronizado(id, registro.updatedAt);
      enviados += 1;
    } catch (error) {
      falhas += 1;
      console.warn(`Falha ao enviar ${id} da coleção ${adaptador.colecao}:`, error);
    }
  }

  return { enviados, baixados, falhas };
}
