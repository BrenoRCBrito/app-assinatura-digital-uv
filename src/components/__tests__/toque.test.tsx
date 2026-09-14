import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { SettingsProvider } from '../../storage/SettingsProvider';
import { tokens } from '../../theme';
import { Button } from '../Button';
import { ChipButton } from '../ChipButton';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

async function estiloDoBotao() {
  return StyleSheet.flatten((await screen.findByRole('button')).props.style);
}

describe('alvo de toque', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('o chip tem a altura mínima do alvo de toque', async () => {
    await render(<ChipButton label="Deitar papel" icon="rotate" onPress={() => undefined} />, {
      wrapper: SettingsProvider,
    });

    expect((await estiloDoBotao()).minHeight).toBe(tokens.size.touchTarget);
  });

  test('o botão pequeno tem a altura mínima do alvo de toque', async () => {
    await render(<Button label="Sair" onPress={() => undefined} preset="danger" size="sm" />, {
      wrapper: SettingsProvider,
    });

    expect((await estiloDoBotao()).minHeight).toBe(tokens.size.touchTarget);
  });
});
