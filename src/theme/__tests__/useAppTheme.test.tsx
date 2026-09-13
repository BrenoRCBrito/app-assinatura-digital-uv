import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook, waitFor } from '@testing-library/react-native';

import { SettingsProvider } from '../../storage/SettingsProvider';
import { darkTheme, lightTheme } from '../appTheme';
import { tokens } from '../tokens';
import { DarkThemeScope, useAppTheme } from '../useAppTheme';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

function ComEscopoEscuro({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <SettingsProvider>
      <DarkThemeScope>{children}</DarkThemeScope>
    </SettingsProvider>
  );
}

describe('useAppTheme', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('junta as cores do tema salvo e os tokens fora do escopo escuro', async () => {
    const { result } = await renderHook(() => useAppTheme(), { wrapper: SettingsProvider });

    await waitFor(() => expect(result.current.themeName).toBe('light'));
    expect(result.current.theme).toEqual({ ...lightTheme, ...tokens });
  });

  test('usa as cores escuras dentro do escopo, mesmo com o tema claro salvo', async () => {
    const { result } = await renderHook(() => useAppTheme(), { wrapper: ComEscopoEscuro });

    await waitFor(() => expect(result.current.themeName).toBe('dark'));
    expect(result.current.theme).toEqual({ ...darkTheme, ...tokens });
  });

  test('entrega o mesmo objeto de tema entre renders', async () => {
    const { result, rerender } = await renderHook(() => useAppTheme(), { wrapper: SettingsProvider });
    await waitFor(() => expect(result.current.themeName).toBe('light'));
    const primeiro = result.current.theme;

    await rerender(undefined);

    expect(result.current.theme).toBe(primeiro);
  });
});
