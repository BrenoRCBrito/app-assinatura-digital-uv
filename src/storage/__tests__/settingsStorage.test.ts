import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_SETTINGS, type Settings } from '../../domain/settings';
import { SETTINGS_STORAGE_KEY, loadSettings, saveSettings } from '../settingsStorage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('settingsStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('devolve o padrão quando nada foi salvo', async () => {
    await expect(loadSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  test('devolve o padrão quando o JSON salvo está corrompido', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, '{theme: dark');

      await expect(loadSettings()).resolves.toEqual(DEFAULT_SETTINGS);
    } finally {
      consoleError.mockRestore();
    }
  });

  test('completa com o padrão o que faltar no dado salvo', async () => {
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ theme: 'dark' }));

    await expect(loadSettings()).resolves.toEqual({ ...DEFAULT_SETTINGS, theme: 'dark' });
  });

  test('carrega o que foi salvo', async () => {
    const settings: Settings = {
      theme: 'dark',
      gestureEngine: 'reanimated',
      salvarCopiaNaGaleria: true,
      loginBiometricoAtivado: true,
      perguntaBiometriaRespondida: true,
      ultimoUsuarioIdBiometria: '1',
    };

    await saveSettings(settings);

    await expect(loadSettings()).resolves.toEqual(settings);
  });
});
