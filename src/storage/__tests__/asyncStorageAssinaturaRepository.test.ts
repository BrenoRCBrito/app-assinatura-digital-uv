import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_SETTINGS } from '../../domain/settings';
import {
  ASSINATURAS_STORAGE_KEY,
  createAsyncStorageAssinaturaRepository,
} from '../asyncStorage/asyncStorageAssinaturaRepository';
import { SETTINGS_STORAGE_KEY } from '../settingsStorage';
import {
  criarAssinaturaDeTeste,
  testarContratoAssinaturaRepository,
  USUARIO_DE_TESTE,
} from '../testing/assinaturaRepositoryContract';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

testarContratoAssinaturaRepository('AsyncStorage', createAsyncStorageAssinaturaRepository, {
  antesDeCada: () => AsyncStorage.clear(),
  corromperDados: () => AsyncStorage.setItem(ASSINATURAS_STORAGE_KEY, '[{"id":'),
});

describe('clear do repositório de assinaturas no AsyncStorage', () => {
  test('apaga as assinaturas sem levar as configurações', async () => {
    await AsyncStorage.clear();
    const salvas = JSON.stringify(DEFAULT_SETTINGS);
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, salvas);
    const repositorio = createAsyncStorageAssinaturaRepository();
    await repositorio.save(criarAssinaturaDeTeste('1', 'Rubrica', '2026-09-10T10:00:00.000Z'));

    await repositorio.clear();

    await expect(repositorio.list(USUARIO_DE_TESTE)).resolves.toEqual([]);
    await expect(AsyncStorage.getItem(SETTINGS_STORAGE_KEY)).resolves.toBe(salvas);
  });
});
