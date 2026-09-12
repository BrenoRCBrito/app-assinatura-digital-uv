import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { DEFAULT_SETTINGS } from '../../domain/settings';
import { SettingsProvider, useSettings } from '../SettingsProvider';
import { loadSettings } from '../settingsStorage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('SettingsProvider', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('mantém as duas mudanças quando updateSettings é chamado em sequência', async () => {
    const { result } = await renderHook(() => useSettings(), { wrapper: SettingsProvider });
    await waitFor(() => expect(result.current.settings).toEqual(DEFAULT_SETTINGS));

    await act(async () => {
      result.current.updateSettings({ theme: 'dark' });
      result.current.updateSettings({ gestureEngine: 'reanimated' });
    });

    const esperado = { ...DEFAULT_SETTINGS, theme: 'dark', gestureEngine: 'reanimated' };
    expect(result.current.settings).toEqual(esperado);
    await expect(loadSettings()).resolves.toEqual(esperado);
  });
});
