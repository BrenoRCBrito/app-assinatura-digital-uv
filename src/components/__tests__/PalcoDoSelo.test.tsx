import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import type { TestInstance } from 'test-renderer';

import { createFraction, createSize, fitSizeInside } from '../../domain/geometry';
import { createCapturedPhoto } from '../../domain/photo';
import { layoutDoSelo, paraPontoNaArea, posicaoInicialDoSelo, type PosicaoSelo } from '../../domain/selo';
import { SettingsProvider } from '../../storage/SettingsProvider';
import { criarAssinaturaDeTeste } from '../../storage/testing/assinaturaRepositoryContract';
import { FIXED_COLORS, lightTheme, tokens } from '../../theme';
import { PalcoDoSelo } from '../PalcoDoSelo';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const FOTO = createCapturedPhoto('file:///cache/foto.jpg', 600, 800);
const ASSINATURA = criarAssinaturaDeTeste('1', 'Rubrica', '2026-09-12T12:00:00.000Z');
const LARGURA = createFraction(0.35);
const PALCO_MEDIDO = { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 300 } } };

function descendentes(no: TestInstance): TestInstance[] {
  return no.children.flatMap((filho) => (typeof filho === 'string' ? [] : [filho, ...descendentes(filho)]));
}

async function mostrarPalco(posicao: PosicaoSelo | null) {
  await render(
    <PalcoDoSelo
      foto={FOTO}
      desenho={ASSINATURA.desenho}
      largura={LARGURA}
      linhas={['12/09/2026 14:32', 'Local ao assinar']}
      posicao={posicao}
      onMudarPosicao={() => undefined}
    />,
    { wrapper: SettingsProvider },
  );
  return screen.findByLabelText('Palco do documento');
}

describe('PalcoDoSelo', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('antes de medir o palco, não mostra a foto nem o selo', async () => {
    await mostrarPalco(null);

    expect(screen.queryByLabelText('Foto do documento')).toBeNull();
    expect(screen.queryByLabelText('Selo da assinatura')).toBeNull();
  });

  test('ajusta a foto ao palco e põe o selo emoldurado na posição inicial', async () => {
    const palco = await mostrarPalco(null);

    await fireEvent(palco, 'layout', PALCO_MEDIDO);

    const area = fitSizeInside(FOTO.size, createSize(300, 300));
    const layout = layoutDoSelo(LARGURA, area, ASSINATURA.desenho.quadro);
    const inicio = posicaoInicialDoSelo(layout.tamanho, area);
    const selo = screen.getByLabelText('Selo da assinatura');
    const moldura = selo.parent;

    expect(StyleSheet.flatten(palco.props.style)).toMatchObject({
      borderRadius: tokens.radius.surface,
      backgroundColor: lightTheme.stage,
    });
    expect(StyleSheet.flatten(screen.getByLabelText('Foto do documento').parent?.props.style)).toMatchObject({
      width: area.width,
      height: area.height,
    });
    expect(StyleSheet.flatten(selo.props.style)).toMatchObject({
      width: layout.tamanho.width,
      height: layout.tamanho.height,
    });
    expect(StyleSheet.flatten(moldura?.props.style)).toMatchObject({ backgroundColor: FIXED_COLORS.stampFill });
    expect(StyleSheet.flatten(moldura?.parent?.props.style)).toMatchObject({ left: inicio.x, top: inicio.y });
    expect(
      descendentes(moldura as TestInstance)
        .map((no) => StyleSheet.flatten(no.props.style))
        .filter((estilo) => estilo?.borderStyle === 'dashed'),
    ).toEqual([expect.objectContaining({ borderColor: FIXED_COLORS.stampBorder })]);
    expect(descendentes(moldura as TestInstance).filter((no) => no.type === 'RNSVGSvgView')).toHaveLength(2);
  });

  test('deixa a alça do selo passar da borda do palco sem cortar', async () => {
    const palco = await mostrarPalco(null);

    expect(StyleSheet.flatten(palco.props.style).overflow).toBeUndefined();
  });

  test('com posição salva, põe o selo na posição em frações da foto', async () => {
    const posicao = { x: createFraction(0.1), y: createFraction(0.2), largura: LARGURA };
    const palco = await mostrarPalco(posicao);

    await fireEvent(palco, 'layout', PALCO_MEDIDO);

    const ponto = paraPontoNaArea(posicao, fitSizeInside(FOTO.size, createSize(300, 300)));

    expect(StyleSheet.flatten(screen.getByLabelText('Selo da assinatura').parent?.parent?.props.style)).toMatchObject({
      left: ponto.x,
      top: ponto.y,
    });
  });
});
