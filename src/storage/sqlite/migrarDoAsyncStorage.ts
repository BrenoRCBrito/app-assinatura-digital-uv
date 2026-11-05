import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SQLiteDatabase } from 'expo-sqlite';

import { paraAssinatura } from '../../domain/assinatura';
import { paraDocumentoAssinado } from '../../domain/documento';
import { createSqliteAssinaturaRepository } from './sqliteAssinaturaRepository';
import { createSqliteDocumentoAssinadoRepository } from './sqliteDocumentoAssinadoRepository';

export const ASSINATURAS_STORAGE_KEY = '@assinaaqui/assinaturas';
export const DOCUMENTOS_STORAGE_KEY = '@assinaaqui/documentos';

async function lerLista(chave: string): Promise<readonly unknown[] | null> {
  const salvo = await AsyncStorage.getItem(chave);
  if (salvo === null) {
    return null;
  }
  const dados: unknown = JSON.parse(salvo);
  if (!Array.isArray(dados)) {
    throw new Error(`A lista salva em ${chave} está corrompida.`);
  }
  return dados;
}

// Só apaga a chave antiga depois de copiar tudo. Se algo falhar, os dados antigos ficam e a cópia
// é tentada de novo na próxima abertura; o que já está no SQLite nunca é sobrescrito.
async function migrarLista<T extends Readonly<{ id: string }>>(
  chave: string,
  converter: (dado: unknown) => T,
  jaExiste: (id: string) => Promise<boolean>,
  salvar: (item: T) => Promise<void>,
): Promise<void> {
  try {
    const dados = await lerLista(chave);
    if (dados === null) {
      return;
    }
    for (const item of dados.map(converter)) {
      if (!(await jaExiste(item.id))) {
        await salvar(item);
      }
    }
    await AsyncStorage.removeItem(chave);
  } catch (error) {
    console.error(`Falha ao migrar ${chave} para o SQLite; os dados antigos foram mantidos:`, error);
  }
}

export async function migrarDoAsyncStorage(db: SQLiteDatabase): Promise<void> {
  // As tabelas já existem neste ponto, então os repositórios não precisam esperar nada.
  const banco = { db, pronto: Promise.resolve() };
  const assinaturas = createSqliteAssinaturaRepository(banco);
  const documentos = createSqliteDocumentoAssinadoRepository(banco);

  await migrarLista(
    ASSINATURAS_STORAGE_KEY,
    paraAssinatura,
    async (id) => (await db.getFirstAsync('SELECT * FROM assinaturas WHERE id = ?', id)) !== null,
    (assinatura) => assinaturas.save(assinatura),
  );
  await migrarLista(
    DOCUMENTOS_STORAGE_KEY,
    paraDocumentoAssinado,
    async (id) => (await db.getFirstAsync('SELECT * FROM documentos WHERE id = ?', id)) !== null,
    (documento) => documentos.save(documento),
  );
}
