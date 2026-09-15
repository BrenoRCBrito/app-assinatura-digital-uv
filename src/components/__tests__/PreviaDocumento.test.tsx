import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { createFraction, createPixels, createSize } from '../../domain/geometry';
import { layoutDaPagina } from '../../domain/pagina';
import { createFileUri } from '../../domain/photo';
import { layoutDoSelo } from '../../domain/selo';
import { SettingsProvider } from '../../storage/SettingsProvider';
import { criarAssinaturaDeTeste } from '../../storage/testing/assinaturaRepositoryContract';
import { FIXED_COLORS, tokens } from '../../theme';
import { PreviaDocumento } from '../PreviaDocumento';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const TAMANHO_FOTO = createSize(3024, 4032);
const SELO = { x: createFraction(0.4), y: createFraction(0.65), largura: createFraction(0.35) };
const DESENHO = criarAssinaturaDeTeste('1', 'Rubrica', '2026-09-12T12:00:00.000Z').desenho;

describe('PreviaDocumento', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('mostra a página em miniatura com a foto e o selo nas proporções do PDF', async () => {
    await render(
      <PreviaDocumento
        foto={createFileUri('file:///app/documentos/1/foto.jpg')}
        tamanhoFoto={TAMANHO_FOTO}
        desenho={DESENHO}
        selo={SELO}
        linhas={['12/09/2026 14:32', 'Vassouras']}
      />,
      { wrapper: SettingsProvider },
    );

    const previa = await screen.findByLabelText('Prévia do documento');
    const foto = screen.getByLabelText('Foto do documento');
    const selo = screen.getByLabelText('Selo da assinatura');
    const pagina = layoutDaPagina(TAMANHO_FOTO, createPixels(132));
    const layout = layoutDoSelo(SELO.largura, pagina.foto, DESENHO.quadro);

    expect(StyleSheet.flatten(previa.props.style)).toMatchObject({
      width: 132,
      height: pagina.pagina.height,
      borderRadius: tokens.radius.documentPreview,
      borderColor: FIXED_COLORS.paperBorder,
      backgroundColor: FIXED_COLORS.paper,
    });
    expect(foto.props.source).toEqual({ uri: 'file:///app/documentos/1/foto.jpg' });
    expect(StyleSheet.flatten(foto.parent?.props.style)).toMatchObject({
      left: pagina.esquerda,
      top: pagina.topo,
      width: pagina.foto.width,
      height: pagina.foto.height,
    });
    expect(StyleSheet.flatten(selo.parent?.props.style)).toMatchObject({
      left: 0.4 * pagina.foto.width,
      top: 0.65 * pagina.foto.height,
    });
    expect(StyleSheet.flatten(selo.props.style)).toMatchObject({
      width: layout.tamanho.width,
      height: layout.tamanho.height,
    });
    expect(screen.getByText('Vassouras')).toBeTruthy();
  });
});
