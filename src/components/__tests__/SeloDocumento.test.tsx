import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import type { TestInstance } from 'test-renderer';

import { createFraction, createSize } from '../../domain/geometry';
import { layoutDoSelo } from '../../domain/selo';
import { SettingsProvider } from '../../storage/SettingsProvider';
import { criarAssinaturaDeTeste } from '../../storage/testing/assinaturaRepositoryContract';
import { FIXED_COLORS } from '../../theme';
import { SeloDocumento } from '../SeloDocumento';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

function descendentes(no: TestInstance): TestInstance[] {
  return no.children.flatMap((filho) => (typeof filho === 'string' ? [] : [filho, ...descendentes(filho)]));
}

describe('SeloDocumento', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('desenha a assinatura e a faixa nas medidas do layout', async () => {
    const assinatura = criarAssinaturaDeTeste('1', 'Rubrica', '2026-09-12T12:00:00.000Z');
    const layout = layoutDoSelo(createFraction(0.5), createSize(400, 600), assinatura.desenho.quadro);

    await render(
      <SeloDocumento desenho={assinatura.desenho} layout={layout} linhas={['12/09/2026 14:32', 'Local ao assinar']} />,
      { wrapper: SettingsProvider },
    );

    const selo = await screen.findByLabelText('Selo da assinatura');
    const svg = descendentes(selo).find((no) => no.type === 'RNSVGSvgView');
    const primeiraLinha = screen.getByText('12/09/2026 14:32');

    expect(StyleSheet.flatten(selo.props.style)).toMatchObject({ width: 200, height: 150 });
    expect(StyleSheet.flatten(svg?.parent?.props.style)).toMatchObject({ height: 100 });
    expect(StyleSheet.flatten(primeiraLinha.parent?.props.style)).toMatchObject({ height: 50 });
    expect(StyleSheet.flatten(primeiraLinha.props.style)).toMatchObject({
      fontSize: 20,
      lineHeight: 25,
      color: FIXED_COLORS.ink,
    });
    expect(
      [primeiraLinha, screen.getByText('Local ao assinar')].map((linha) => linha.props.numberOfLines),
    ).toEqual([1, 1]);
  });
});
