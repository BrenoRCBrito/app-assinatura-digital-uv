import { createAsyncStorageAssinaturaRepository } from './asyncStorage/asyncStorageAssinaturaRepository';
import { createAsyncStorageDocumentoAssinadoRepository } from './asyncStorage/asyncStorageDocumentoAssinadoRepository';
import { createInMemoryAssinaturaRepository } from './inMemory/inMemoryAssinaturaRepository';
import { createInMemoryDocumentoAssinadoRepository } from './inMemory/inMemoryDocumentoAssinadoRepository';
import type { Repositories } from './repositories';

export type StorageType = 'asyncStorage' | 'inMemory';

export const STORAGE_TYPE: StorageType = 'asyncStorage';

export function createRepositories(storageType: StorageType): Repositories {
  switch (storageType) {
    case 'asyncStorage':
      return {
        assinaturas: createAsyncStorageAssinaturaRepository(),
        documentos: createAsyncStorageDocumentoAssinadoRepository(),
      };
    case 'inMemory':
      return {
        assinaturas: createInMemoryAssinaturaRepository(),
        documentos: createInMemoryDocumentoAssinadoRepository(),
      };
  }
}
