import { createInMemoryAssinaturaRepository } from './inMemory/inMemoryAssinaturaRepository';
import { createInMemoryCursorRepository } from './inMemory/inMemoryCursorRepository';
import { createInMemoryDocumentoAssinadoRepository } from './inMemory/inMemoryDocumentoAssinadoRepository';
import { createInMemoryUsuarioRepository } from './inMemory/inMemoryUsuarioRepository';
import type { Repositories } from './repositories';
import { abrirBanco } from './sqlite/banco';
import { createSqliteAssinaturaRepository } from './sqlite/sqliteAssinaturaRepository';
import { createSqliteCursorRepository } from './sqlite/sqliteCursorRepository';
import { createSqliteDocumentoAssinadoRepository } from './sqlite/sqliteDocumentoAssinadoRepository';
import { createSqliteUsuarioRepository } from './sqlite/sqliteUsuarioRepository';

export type StorageType = 'sqlite' | 'inMemory';

export const STORAGE_TYPE: StorageType = 'sqlite';

export function createRepositories(storageType: StorageType): Repositories {
  switch (storageType) {
    case 'sqlite': {
      const banco = abrirBanco();
      return {
        assinaturas: createSqliteAssinaturaRepository(banco),
        cursores: createSqliteCursorRepository(banco),
        documentos: createSqliteDocumentoAssinadoRepository(banco),
        usuarios: createSqliteUsuarioRepository(banco),
      };
    }
    case 'inMemory':
      return {
        assinaturas: createInMemoryAssinaturaRepository(),
        cursores: createInMemoryCursorRepository(),
        documentos: createInMemoryDocumentoAssinadoRepository(),
        usuarios: createInMemoryUsuarioRepository(),
      };
  }
}
