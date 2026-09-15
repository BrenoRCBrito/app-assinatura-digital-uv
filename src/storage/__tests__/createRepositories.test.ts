import AsyncStorage from '@react-native-async-storage/async-storage';

import { createRepositories } from '../createRepositories';
import { criarAssinaturaDeTeste } from '../testing/assinaturaRepositoryContract';
import { criarDocumentoDeTeste } from '../testing/documentoAssinadoRepositoryContract';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('createRepositories', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('com AsyncStorage, repositórios criados em momentos diferentes veem os mesmos dados', async () => {
    const assinatura = criarAssinaturaDeTeste('1', 'Rubrica', '2026-09-12T10:00:00.000Z');

    await createRepositories('asyncStorage').assinaturas.save(assinatura);

    await expect(createRepositories('asyncStorage').assinaturas.list()).resolves.toEqual([assinatura]);
  });

  test('com AsyncStorage, os documentos também continuam de uma instância para a outra', async () => {
    const documento = criarDocumentoDeTeste('1', 'Contrato de locação', '2026-09-12T10:00:00.000Z');

    await createRepositories('asyncStorage').documentos.save(documento);

    await expect(createRepositories('asyncStorage').documentos.findById(documento.id)).resolves.toEqual(documento);
  });

  test('em memória, cada chamada começa vazia', async () => {
    await createRepositories('inMemory').assinaturas.save(
      criarAssinaturaDeTeste('1', 'Rubrica', '2026-09-12T10:00:00.000Z'),
    );

    await expect(createRepositories('inMemory').assinaturas.list()).resolves.toEqual([]);
  });
});
