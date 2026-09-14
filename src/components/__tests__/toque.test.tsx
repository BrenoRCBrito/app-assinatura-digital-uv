import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { SettingsProvider } from '../../storage/SettingsProvider';
import { tokens } from '../../theme';
import { Button } from '../Button';
import { ChipButton } from '../ChipButton';
import { IconButton } from '../IconButton';
import { SegmentedControl } from '../SegmentedControl';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const DEDO_NA_TELA = {
  nativeEvent: { timestamp: 0, locationX: 1, locationY: 1, pageX: 1, pageY: 1, touches: [], changedTouches: [] },
  persist: jest.fn(),
  dispatchConfig: { registrationName: 'onResponderGrant' },
};

async function estiloDoBotao() {
  return StyleSheet.flatten((await screen.findByRole('button')).props.style);
}

async function estiloPressionado(papel: 'button' | 'radio') {
  const [controle] = await screen.findAllByRole(papel);
  await fireEvent(controle, 'responderGrant', DEDO_NA_TELA);
  return StyleSheet.flatten(screen.getAllByRole(papel)[0].props.style);
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

describe('retorno ao pressionar', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('o botão fica com a opacidade de pressionado', async () => {
    await render(<Button label="Salvar" onPress={() => undefined} />, { wrapper: SettingsProvider });

    expect((await estiloPressionado('button')).opacity).toBe(tokens.opacity.pressed);
  });

  test('o botão de ícone fica com a opacidade de pressionado', async () => {
    await render(<IconButton icon="trash" label="Excluir Rubrica" onPress={() => undefined} />, {
      wrapper: SettingsProvider,
    });

    expect((await estiloPressionado('button')).opacity).toBe(tokens.opacity.pressed);
  });

  test('o segmento fica com a opacidade de pressionado', async () => {
    await render(
      <SegmentedControl
        options={[
          { value: 'light', label: 'Claro' },
          { value: 'dark', label: 'Escuro' },
        ]}
        selected="light"
        onSelect={() => undefined}
      />,
      { wrapper: SettingsProvider },
    );

    expect((await estiloPressionado('radio')).opacity).toBe(tokens.opacity.pressed);
  });

  test('o chip fica com a opacidade de pressionado', async () => {
    await render(<ChipButton label="Deitar papel" icon="rotate" onPress={() => undefined} />, {
      wrapper: SettingsProvider,
    });

    expect((await estiloPressionado('button')).opacity).toBe(tokens.opacity.pressed);
  });
});
