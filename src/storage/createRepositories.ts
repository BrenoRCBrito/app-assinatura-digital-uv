import { createAsyncStorageAssinaturaRepository } from './asyncStorage/asyncStorageAssinaturaRepository';
import { createInMemoryAssinaturaRepository } from './inMemory/inMemoryAssinaturaRepository';
import type { Repositories } from './repositories';

export type StorageType = 'asyncStorage' | 'inMemory';

export const STORAGE_TYPE: StorageType = 'asyncStorage';

export function createRepositories(storageType: StorageType): Repositories {
  switch (storageType) {
    case 'asyncStorage':
      return { assinaturas: createAsyncStorageAssinaturaRepository() };
    case 'inMemory':
      return { assinaturas: createInMemoryAssinaturaRepository() };
  }
}
