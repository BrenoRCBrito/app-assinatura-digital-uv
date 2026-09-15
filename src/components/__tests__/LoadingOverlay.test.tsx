import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { SettingsProvider } from '../../storage/SettingsProvider';
import { FIXED_COLORS, lightTheme, tokens } from '../../theme';
import { LoadingOverlay } from '../LoadingOverlay';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('LoadingOverlay', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('visível, mostra o indicador e a mensagem num cartão sobre a tela escurecida', async () => {
    await render(<LoadingOverlay visible message="Assinando o documento…" />, { wrapper: SettingsProvider });
    const cartao = (await screen.findByText('Assinando o documento…')).parent;

    expect(screen.getByLabelText('Carregando')).toBeTruthy();
    expect(StyleSheet.flatten(cartao?.props.style)).toEqual({
      alignItems: 'center',
      gap: tokens.gap.loading,
      padding: tokens.inset.feature,
      borderRadius: tokens.radius.surface,
      backgroundColor: lightTheme.surface,
    });
    expect(StyleSheet.flatten(cartao?.parent?.props.style)).toEqual({
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: tokens.inset.screen,
      backgroundColor: FIXED_COLORS.scrim,
    });
  });

  test('invisível, não mostra nada por cima da tela', async () => {
    await render(
      <>
        <Text>Posicionar assinatura</Text>
        <LoadingOverlay visible={false} message="Assinando o documento…" />
      </>,
      { wrapper: SettingsProvider },
    );

    await screen.findByText('Posicionar assinatura');

    expect(screen.queryByText('Assinando o documento…')).toBeNull();
    expect(screen.queryByLabelText('Carregando')).toBeNull();
  });
});
