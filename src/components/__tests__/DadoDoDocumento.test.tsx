import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { SettingsProvider } from '../../storage/SettingsProvider';
import { lightTheme, tokens } from '../../theme';
import { DadoDoDocumento } from '../DadoDoDocumento';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('DadoDoDocumento', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('mostra o rótulo discreto e o valor forte, com o espaço de dado entre os dois', async () => {
    await render(<DadoDoDocumento rotulo="Assinado em" valor="12/09/2026 14:32" />, { wrapper: SettingsProvider });

    const rotulo = await screen.findByText('Assinado em');

    expect(StyleSheet.flatten(rotulo.props.style).color).toBe(lightTheme.textMuted);
    expect(StyleSheet.flatten(screen.getByText('12/09/2026 14:32').props.style)).toMatchObject({
      fontSize: 15,
      fontWeight: '600',
    });
    expect(StyleSheet.flatten(rotulo.parent?.props.style)).toMatchObject({ gap: tokens.gap.dataItem });
  });

  test('o preset de coordenadas usa o texto das coordenadas', async () => {
    await render(<DadoDoDocumento rotulo="Coordenadas" valor="-22.40418, -43.66283" preset="coordenadas" />, {
      wrapper: SettingsProvider,
    });

    expect(StyleSheet.flatten((await screen.findByText('-22.40418, -43.66283')).props.style)).toMatchObject({
      fontSize: 14,
      fontWeight: '500',
    });
  });
});
