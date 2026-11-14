import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { criarEnderecoDaApi } from '../../domain/enderecoDaApi';
import { DEFAULT_SETTINGS } from '../../domain/settings';
import { definirEnderecoConfigurado, enderecoDaApi } from '../../services/apiDeDocumentos';
import { SettingsProvider, useSettings } from '../../storage/SettingsProvider';
import { SETTINGS_STORAGE_KEY } from '../../storage/settingsStorage';
import { useEnderecoDaApi } from '../useEnderecoDaApi';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

function useEnderecoComConfiguracoes() {
  useEnderecoDaApi();
  return useSettings();
}

const fetchOriginal = global.fetch;
let fetchSimulado: jest.Mock;

describe('useEnderecoDaApi', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    definirEnderecoConfigurado(null);
    fetchSimulado = jest.fn().mockResolvedValue({ status: 200, ok: true });
    global.fetch = fetchSimulado as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = fetchOriginal;
  });

  test('acorda a API no endereço salvo, e de novo quando ele muda', async () => {
    await AsyncStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_SETTINGS, enderecoDaApi: 'http://192.168.0.10:3000' }),
    );

    const { result } = await renderHook(useEnderecoComConfiguracoes, { wrapper: SettingsProvider });

    await waitFor(() =>
      expect(fetchSimulado).toHaveBeenCalledWith('http://192.168.0.10:3000/saude', expect.anything()),
    );

    await act(async () => {
      result.current.updateSettings({ enderecoDaApi: criarEnderecoDaApi('http://10.0.2.2:3000') });
    });
    expect(fetchSimulado).toHaveBeenCalledWith('http://10.0.2.2:3000/saude', expect.anything());
  });

  test('leva para o serviço o endereço salvo nas Configurações e acompanha as mudanças', async () => {
    await AsyncStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_SETTINGS, enderecoDaApi: 'http://192.168.0.10:3000' }),
    );

    const { result } = await renderHook(useEnderecoComConfiguracoes, { wrapper: SettingsProvider });

    await waitFor(() => expect(enderecoDaApi()).toBe('http://192.168.0.10:3000'));

    await act(async () => {
      result.current.updateSettings({ enderecoDaApi: criarEnderecoDaApi('http://10.0.2.2:3000') });
    });
    expect(enderecoDaApi()).toBe('http://10.0.2.2:3000');
  });
});
