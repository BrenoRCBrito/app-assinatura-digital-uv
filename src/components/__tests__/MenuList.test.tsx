import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { processColor, StyleSheet } from 'react-native';
import type { TestInstance } from 'test-renderer';

import { SettingsProvider } from '../../storage/SettingsProvider';
import { lightTheme, tokens } from '../../theme';
import { MenuList } from '../MenuList';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

function descendentes(no: TestInstance): TestInstance[] {
  return no.children.flatMap((filho) => (typeof filho === 'string' ? [] : [filho, ...descendentes(filho)]));
}

function estilo(no: TestInstance | null | undefined) {
  return StyleSheet.flatten(no?.props.style);
}

function tracosDe(svg: TestInstance) {
  return descendentes(svg)
    .filter((no) => no.type === 'RNSVGPath')
    .map((traco) => [traco.props.stroke, traco.props.strokeWidth]);
}

function cor(valor: string) {
  return { type: 0, payload: processColor(valor) };
}

async function mostrarMenu() {
  const acoes = { assinaturas: jest.fn(), configuracoes: jest.fn() };
  await render(
    <MenuList
      items={[
        { label: 'Minhas assinaturas', icon: 'signatures', onPress: acoes.assinaturas },
        { label: 'Configurações', icon: 'settings', onPress: acoes.configuracoes },
      ]}
    />,
    { wrapper: SettingsProvider },
  );
  await screen.findByText('Minhas assinaturas');
  return acoes;
}

describe('MenuList', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('cada linha chama a própria ação', async () => {
    const acoes = await mostrarMenu();

    await fireEvent.press(screen.getByText('Configurações'));

    expect(acoes.configuracoes).toHaveBeenCalledTimes(1);
    expect(acoes.assinaturas).not.toHaveBeenCalled();
  });

  test('as linhas têm a altura do canvas e uma divisória recuada até o texto', async () => {
    await mostrarMenu();
    const linhas = screen.getAllByRole('button');
    const divisorias = descendentes(screen.container).filter((no) => estilo(no)?.backgroundColor === lightTheme.divider);

    expect(linhas.map((linha) => [estilo(linha).minHeight, estilo(linha).paddingHorizontal, estilo(linha).gap])).toEqual([
      [tokens.size.menuItem, tokens.inset.menuItemX, tokens.gap.item],
      [tokens.size.menuItem, tokens.inset.menuItemX, tokens.gap.item],
    ]);
    expect(divisorias.map((divisoria) => estilo(divisoria))).toEqual([
      {
        height: tokens.lineWidth.hairline,
        marginLeft: tokens.inset.menuItemX + tokens.size.menuIconBox + tokens.gap.item,
        backgroundColor: lightTheme.divider,
      },
    ]);
  });

  test('o ícone fica numa caixa com o fundo da tela, e a seta fica apagada', async () => {
    await mostrarMenu();
    const [linha] = screen.getAllByRole('button');
    const svgs = descendentes(linha).filter((no) => no.type === 'RNSVGSvgView');
    const [icone, seta] = svgs;

    expect(svgs).toHaveLength(2);
    expect(estilo(icone.parent)).toMatchObject({
      width: tokens.size.menuIconBox,
      height: tokens.size.menuIconBox,
      borderRadius: tokens.radius.menuIconBox,
      backgroundColor: lightTheme.background,
    });
    expect([estilo(icone).width, estilo(seta).width]).toEqual([tokens.size.iconMenu, tokens.size.iconMenu]);
    expect(tracosDe(icone)).toEqual([
      [cor(lightTheme.textSecondary), tokens.lineWidth.iconBoxed],
      [cor(lightTheme.textSecondary), tokens.lineWidth.iconBoxed],
    ]);
    expect(tracosDe(seta)).toEqual([[cor(lightTheme.textMuted), tokens.lineWidth.iconTrailing]]);
  });
});
