import { createAsyncStorageAssinaturaRepository } from './asyncStorage/asyncStorageAssinaturaRepository';
import { createAsyncStorageDocumentoAssinadoRepository } from './asyncStorage/asyncStorageDocumentoAssinadoRepository';
import { createInMemoryAssinaturaRepository } from './inMemory/inMemoryAssinaturaRepository';
import { createInMemoryDocumentoAssinadoRepository } from './inMemory/inMemoryDocumentoAssinadoRepository';
import { createInMemoryUsuarioRepository } from './inMemory/inMemoryUsuarioRepository';
import type { Repositories } from './repositories';
import { createSqliteUsuarioRepository } from './sqlite/sqliteUsuarioRepository';

export type StorageType = 'asyncStorage' | 'inMemory';

export const STORAGE_TYPE: StorageType = 'asyncStorage';

export function createRepositories(storageType: StorageType): Repositories {
  switch (storageType) {
    case 'asyncStorage':
      return {
        assinaturas: createAsyncStorageAssinaturaRepository(),
        documentos: createAsyncStorageDocumentoAssinadoRepository(),
        usuarios: createSqliteUsuarioRepository(),
      };
    case 'inMemory':
      return {
        assinaturas: createInMemoryAssinaturaRepository(),
        documentos: createInMemoryDocumentoAssinadoRepository(),
        usuarios: createInMemoryUsuarioRepository(),
      };
  }
}
