import AsyncStorage from '@react-native-async-storage/async-storage';

import { createRepositories } from '../createRepositories';
import { criarAssinaturaDeTeste } from '../testing/assinaturaRepositoryContract';

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

  test('em memória, cada chamada começa vazia', async () => {
    await createRepositories('inMemory').assinaturas.save(
      criarAssinaturaDeTeste('1', 'Rubrica', '2026-09-12T10:00:00.000Z'),
    );

    await expect(createRepositories('inMemory').assinaturas.list()).resolves.toEqual([]);
  });
});
