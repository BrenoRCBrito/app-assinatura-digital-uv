import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen } from '@testing-library/react-native';
import { processColor, StyleSheet, Text as NativeText } from 'react-native';
import type { TestInstance } from 'test-renderer';

import { SettingsProvider } from '../../storage/SettingsProvider';
import { lightTheme, tokens } from '../../theme';
import { FeatureCard } from '../FeatureCard';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

function descendentes(no: TestInstance): TestInstance[] {
  return no.children.flatMap((filho) => (typeof filho === 'string' ? [] : [filho, ...descendentes(filho)]));
}

function estilo(no: TestInstance | null | undefined) {
  return StyleSheet.flatten(no?.props.style);
}

async function mostrarCartao() {
  await render(
    <FeatureCard icon="documentSign" title="Assinar documento" description="Fotografe o documento.">
      <NativeText>Ação</NativeText>
    </FeatureCard>,
    { wrapper: SettingsProvider },
  );
  return screen.findByText('Assinar documento');
}

describe('FeatureCard', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('o cartão tem a cor principal, com o ícone grande numa caixa e a ação dentro dele', async () => {
    await mostrarCartao();
    const nos = descendentes(screen.container);
    const svg = nos.find((no) => no.type === 'RNSVGSvgView');
    const tracos = nos.filter((no) => no.type === 'RNSVGPath');

    expect(estilo(screen.getByText('Ação').parent)).toEqual({
      gap: tokens.gap.feature,
      padding: tokens.inset.feature,
      borderRadius: tokens.radius.feature,
      backgroundColor: lightTheme.primary,
    });
    expect(estilo(svg?.parent)).toMatchObject({
      width: tokens.size.featureIconBox,
      height: tokens.size.featureIconBox,
      borderRadius: tokens.radius.featureIconBox,
      backgroundColor: lightTheme.primaryMuted,
    });
    expect(estilo(svg)).toMatchObject({ width: tokens.size.iconFeature, height: tokens.size.iconFeature });
    expect(tracos).toHaveLength(3);
    expect(tracos.map((traco) => [traco.props.stroke, traco.props.strokeWidth])).toEqual(
      tracos.map(() => [{ type: 0, payload: processColor(lightTheme.onPrimary) }, tokens.lineWidth.iconFeature]),
    );
  });

  test('o título e a descrição ficam juntos, nas cores sobre a cor principal', async () => {
    const titulo = await mostrarCartao();

    expect(estilo(titulo.parent)).toEqual({ gap: tokens.gap.titleText });
    expect(estilo(titulo)).toEqual({ ...tokens.typography.screenTitle, color: lightTheme.onPrimary });
    expect(estilo(screen.getByText('Fotografe o documento.'))).toEqual({
      ...tokens.typography.supporting,
      color: lightTheme.onPrimaryMuted,
    });
  });
});
