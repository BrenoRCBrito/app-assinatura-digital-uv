import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  ASSINATURAS_STORAGE_KEY,
  createAsyncStorageAssinaturaRepository,
} from '../asyncStorage/asyncStorageAssinaturaRepository';
import { testarContratoAssinaturaRepository } from '../testing/assinaturaRepositoryContract';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

testarContratoAssinaturaRepository('AsyncStorage', createAsyncStorageAssinaturaRepository, {
  antesDeCada: () => AsyncStorage.clear(),
  corromperDados: () => AsyncStorage.setItem(ASSINATURAS_STORAGE_KEY, '[{"id":'),
});
