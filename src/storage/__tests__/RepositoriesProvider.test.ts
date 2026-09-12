import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook } from '@testing-library/react-native';

import { ASSINATURAS_STORAGE_KEY } from '../asyncStorage/asyncStorageAssinaturaRepository';
import { RepositoriesProvider, useRepositories } from '../RepositoriesProvider';
import { criarAssinaturaDeTeste } from '../testing/assinaturaRepositoryContract';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('RepositoriesProvider', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('entrega a mesma instância em todos os renders', async () => {
    const { result, rerender } = await renderHook(() => useRepositories(), { wrapper: RepositoriesProvider });
    const primeira = result.current;

    await rerender(undefined);

    expect(result.current).toBe(primeira);
  });

  test('entrega os repositórios do AsyncStorage', async () => {
    const { result } = await renderHook(() => useRepositories(), { wrapper: RepositoriesProvider });

    await result.current.assinaturas.save(criarAssinaturaDeTeste('1', 'Rubrica', '2026-09-12T10:00:00.000Z'));

    await expect(AsyncStorage.getItem(ASSINATURAS_STORAGE_KEY)).resolves.not.toBeNull();
  });
});
