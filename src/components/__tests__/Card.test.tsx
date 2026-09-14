import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet, Text as NativeText } from 'react-native';

import { SettingsProvider } from '../../storage/SettingsProvider';
import { tokens } from '../../theme';
import { Card } from '../Card';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

function estiloDoPai(texto: string) {
  return StyleSheet.flatten(screen.getByText(texto).parent?.props.style);
}

describe('Card', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('junta título e descrição com o espaço de texto e deixa o conteúdo com o espaço do cartão', async () => {
    await render(
      <Card title="Tema" description="Muda as cores do app.">
        <NativeText>Controle</NativeText>
      </Card>,
      { wrapper: SettingsProvider },
    );

    await screen.findByText('Tema');

    expect(estiloDoPai('Tema')).toEqual({ gap: tokens.gap.text });
    expect(estiloDoPai('Muda as cores do app.')).toEqual({ gap: tokens.gap.text });
    expect(estiloDoPai('Controle').gap).toBe(tokens.gap.card);
  });

  test('sem título, mostra só o conteúdo com o espaço do cartão', async () => {
    await render(
      <Card>
        <NativeText>Controle</NativeText>
      </Card>,
      { wrapper: SettingsProvider },
    );

    await screen.findByText('Controle');

    expect(estiloDoPai('Controle').gap).toBe(tokens.gap.card);
  });

  test('não aceita descrição sem título', () => {
    const cartao = (
      // @ts-expect-error a descrição só aparece junto do título
      <Card description="Muda as cores do app.">
        <NativeText>Controle</NativeText>
      </Card>
    );

    expect(cartao.props.description).toBe('Muda as cores do app.');
  });
});
