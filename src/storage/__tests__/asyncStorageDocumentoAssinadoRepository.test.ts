import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_SETTINGS } from '../../domain/settings';
import {
  createAsyncStorageDocumentoAssinadoRepository,
  DOCUMENTOS_STORAGE_KEY,
} from '../asyncStorage/asyncStorageDocumentoAssinadoRepository';
import { SETTINGS_STORAGE_KEY } from '../settingsStorage';
import {
  criarDocumentoDeTeste,
  testarContratoDocumentoAssinadoRepository,
  USUARIO_DE_TESTE,
} from '../testing/documentoAssinadoRepositoryContract';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

testarContratoDocumentoAssinadoRepository('AsyncStorage', createAsyncStorageDocumentoAssinadoRepository, {
  antesDeCada: () => AsyncStorage.clear(),
  corromperDados: () => AsyncStorage.setItem(DOCUMENTOS_STORAGE_KEY, '[{"id":'),
});

describe('clear do repositório de documentos no AsyncStorage', () => {
  test('apaga os documentos sem levar as configurações', async () => {
    await AsyncStorage.clear();
    const salvas = JSON.stringify(DEFAULT_SETTINGS);
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, salvas);
    const repositorio = createAsyncStorageDocumentoAssinadoRepository();
    await repositorio.save(criarDocumentoDeTeste('1', 'Contrato', '2026-09-10T10:00:00.000Z'));

    await repositorio.clear();

    await expect(repositorio.list(USUARIO_DE_TESTE)).resolves.toEqual([]);
    await expect(AsyncStorage.getItem(SETTINGS_STORAGE_KEY)).resolves.toBe(salvas);
  });
});
