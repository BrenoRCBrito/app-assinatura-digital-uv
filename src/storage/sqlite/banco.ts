import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import { migrarDoAsyncStorage } from './migrarDoAsyncStorage';

export const NOME_DO_BANCO = 'assinaaqui.db';

export type Banco = Readonly<{ db: SQLiteDatabase; pronto: Promise<void> }>;

async function prepararBanco(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS assinaturas (
      id TEXT PRIMARY KEY NOT NULL,
      usuario_id TEXT NOT NULL,
      nome TEXT NOT NULL,
      desenho TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      sync_status TEXT NOT NULL DEFAULT 'pending'
    );
    CREATE INDEX IF NOT EXISTS idx_assinaturas_usuario ON assinaturas (usuario_id, deleted_at);

    CREATE TABLE IF NOT EXISTS documentos (
      id TEXT PRIMARY KEY NOT NULL,
      usuario_id TEXT NOT NULL,
      titulo TEXT NOT NULL,
      assinatura_usada TEXT NOT NULL,
      tamanho_foto TEXT NOT NULL,
      selo TEXT NOT NULL,
      local_assinatura TEXT NOT NULL,
      assinado_em TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      sync_status TEXT NOT NULL DEFAULT 'pending'
    );
    CREATE INDEX IF NOT EXISTS idx_documentos_usuario ON documentos (usuario_id, deleted_at);
  `);
  await migrarDoAsyncStorage(db);
}

export function abrirBanco(): Banco {
  const db = openDatabaseSync(NOME_DO_BANCO);
  return { db, pronto: prepararBanco(db) };
}
