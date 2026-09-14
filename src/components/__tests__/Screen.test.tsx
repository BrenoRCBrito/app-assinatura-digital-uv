import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';

import { SettingsProvider } from '../../storage/SettingsProvider';
import { FIXED_COLORS, lightTheme, tokens, type Theme } from '../../theme';
import { listPresets } from '../List/presets';
import { Screen } from '../Screen';
import { screenPresets } from '../Screen/presets';
import { Text } from '../Text';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

const theme: Theme = { ...lightTheme, ...tokens };

function topo(estilo: ViewStyle) {
  return estilo.paddingTop ?? estilo.paddingVertical ?? estilo.padding;
}

function lado(estilo: ViewStyle) {
  return estilo.paddingHorizontal ?? estilo.padding;
}

function fundoAcima(texto: string) {
  let no = screen.getByText(texto).parent;
  while (no !== null && StyleSheet.flatten(no.props.style)?.backgroundColor === undefined) {
    no = no.parent;
  }
  return no === null ? undefined : StyleSheet.flatten(no.props.style)?.backgroundColor;
}

describe('moldura das telas', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('toda tela com cabeçalho começa o conteúdo no topo do tema', () => {
    const topos = [
      topo(listPresets.default(theme).content),
      topo(screenPresets.form.content(theme)),
      topo(screenPresets.scroll.content(theme)),
      topo(screenPresets.menu.content(theme)),
    ];

    expect(topos).toEqual([
      theme.inset.screenTop,
      theme.inset.screenTop,
      theme.inset.screenTop,
      theme.inset.screenTop,
    ]);
  });

  test('as telas claras usam a mesma margem lateral', () => {
    const lados = [
      lado(listPresets.default(theme).content),
      lado(screenPresets.form.content(theme)),
      lado(screenPresets.scroll.content(theme)),
      lado(screenPresets.menu.content(theme)),
      lado(screenPresets.centered.content(theme)),
    ];

    expect(lados).toEqual([
      theme.inset.screen,
      theme.inset.screen,
      theme.inset.screen,
      theme.inset.screen,
      theme.inset.screen,
    ]);
  });

  test.each(['list', 'immersive'] as const)('o rodapé da tela %s tem o espaçamento das outras telas', async (preset) => {
    await render(
      <Screen preset={preset} footer={<Text preset="itemTitle">Rodapé</Text>}>
        <Text preset="itemTitle">Conteúdo</Text>
      </Screen>,
      { wrapper: SettingsProvider },
    );

    const rodape = (await screen.findByText('Rodapé')).parent;

    expect(StyleSheet.flatten(rodape?.props.style)).toEqual({
      paddingHorizontal: theme.inset.screen,
      paddingVertical: theme.inset.footerY,
    });
  });

  test.each([
    ['menu', lightTheme.background],
    ['camera', FIXED_COLORS.cameraBackground],
    ['preview', FIXED_COLORS.cameraBackground],
  ] as const)('a tela %s pinta o fundo do preset', async (preset, fundo) => {
    await render(
      <Screen preset={preset}>
        <Text preset="itemTitle">Conteúdo</Text>
      </Screen>,
      { wrapper: SettingsProvider },
    );

    await screen.findByText('Conteúdo');

    expect(fundoAcima('Conteúdo')).toBe(fundo);
  });
});
