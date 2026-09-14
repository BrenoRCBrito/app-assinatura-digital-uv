import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { SettingsProvider } from '../../storage/SettingsProvider';
import { tokens } from '../../theme';
import { Button } from '../Button';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('Button', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('o contorno desconta a borda do espaçamento vertical de qualquer tamanho', async () => {
    await render(<Button label="Sair" onPress={() => undefined} preset="secondary" size="sm" />, {
      wrapper: SettingsProvider,
    });

    const estilo = StyleSheet.flatten((await screen.findByRole('button')).props.style);

    expect([estilo.paddingVertical, estilo.borderWidth]).toEqual([
      tokens.inset.dangerY - tokens.lineWidth.outline,
      tokens.lineWidth.outline,
    ]);
  });

  test('o tamanho md tem a altura mínima do campo de texto', async () => {
    await render(<Button label="Salvar" onPress={() => undefined} />, { wrapper: SettingsProvider });

    const estilo = StyleSheet.flatten((await screen.findByRole('button')).props.style);

    expect([estilo.minHeight, estilo.paddingVertical]).toEqual([tokens.size.control, tokens.inset.buttonY]);
  });
});
