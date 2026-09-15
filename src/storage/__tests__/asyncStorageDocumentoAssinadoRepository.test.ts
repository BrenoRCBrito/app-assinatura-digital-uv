import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  createAsyncStorageDocumentoAssinadoRepository,
  DOCUMENTOS_STORAGE_KEY,
} from '../asyncStorage/asyncStorageDocumentoAssinadoRepository';
import { testarContratoDocumentoAssinadoRepository } from '../testing/documentoAssinadoRepositoryContract';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

testarContratoDocumentoAssinadoRepository('AsyncStorage', createAsyncStorageDocumentoAssinadoRepository, {
  antesDeCada: () => AsyncStorage.clear(),
  corromperDados: () => AsyncStorage.setItem(DOCUMENTOS_STORAGE_KEY, '[{"id":'),
});
