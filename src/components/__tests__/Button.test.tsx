import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen } from '@testing-library/react-native';
import { processColor, StyleSheet } from 'react-native';
import type { TestInstance } from 'test-renderer';

import { SettingsProvider } from '../../storage/SettingsProvider';
import { lightTheme, tokens } from '../../theme';
import { Button } from '../Button';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

function descendentes(no: TestInstance): TestInstance[] {
  return no.children.flatMap((filho) => (typeof filho === 'string' ? [] : [filho, ...descendentes(filho)]));
}

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

  test('mostra o ícone antes do rótulo, no tamanho de ícone junto a texto e na cor do rótulo', async () => {
    await render(<Button label="Entrar" icon="fingerprint" onPress={() => undefined} />, { wrapper: SettingsProvider });

    const botao = await screen.findByRole('button');
    const nos = descendentes(botao);
    const svg = nos.find((no) => no.type === 'RNSVGSvgView');
    const tracos = nos.filter((no) => no.type === 'RNSVGPath');
    const corDoRotulo = processColor(StyleSheet.flatten(screen.getByText('Entrar').props.style).color);

    expect(svg === undefined ? null : StyleSheet.flatten(svg.props.style)).toMatchObject({
      width: tokens.size.iconSmall,
      height: tokens.size.iconSmall,
    });
    expect(nos.findIndex((no) => no.type === 'RNSVGSvgView')).toBeLessThan(nos.findIndex((no) => no.type === 'Text'));
    expect(tracos).toHaveLength(5);
    expect(tracos.map((traco) => [traco.props.stroke, traco.props.strokeWidth])).toEqual(
      tracos.map(() => [{ type: 0, payload: corDoRotulo }, tokens.lineWidth.iconSmall]),
    );
    expect(StyleSheet.flatten(botao.props.style).gap).toBe(tokens.gap.icon);
  });

  test('deixa o rótulo encolher e quebrar linha dentro do botão', async () => {
    await render(<Button label="Limpar" onPress={() => undefined} preset="secondary" flex={1} />, {
      wrapper: SettingsProvider,
    });

    const contornoDoRotulo = (await screen.findByText('Limpar')).parent;

    expect(StyleSheet.flatten(contornoDoRotulo?.props.style)?.flexShrink).toBe(1);
  });

  test('com flex, aperta o espaço lateral para o rótulo caber em tela pequena', async () => {
    await render(<Button label="Limpar" onPress={() => undefined} preset="secondary" flex={1} />, {
      wrapper: SettingsProvider,
    });

    const botao = await screen.findByRole('button');

    expect(StyleSheet.flatten(botao.props.style).paddingHorizontal).toBe(tokens.inset.buttonTight);
  });

  test('sem flex, o botão reserva a largura do rótulo com o espaço cheio', async () => {
    await render(<Button label="Limpar" onPress={() => undefined} preset="secondary" />, {
      wrapper: SettingsProvider,
    });

    const botao = await screen.findByRole('button');

    expect(StyleSheet.flatten(botao.props.style).paddingHorizontal).toBe(tokens.inset.buttonX);
  });

  test('o botão invertido tem fundo claro, com texto e ícone na cor principal', async () => {
    await render(<Button label="Digitalizar documento" icon="camera" preset="inverse" onPress={() => undefined} />, {
      wrapper: SettingsProvider,
    });

    const botao = await screen.findByRole('button');
    const tracos = descendentes(botao).filter((no) => no.type === 'RNSVGPath');
    const corPrincipal = processColor(lightTheme.primary);

    expect(StyleSheet.flatten(botao.props.style).backgroundColor).toBe(lightTheme.onPrimary);
    expect(StyleSheet.flatten(screen.getByText('Digitalizar documento').props.style).color).toBe(lightTheme.primary);
    expect(tracos.map((traco) => traco.props.stroke)).toEqual([
      { type: 0, payload: corPrincipal },
      { type: 0, payload: corPrincipal },
    ]);
  });
});
