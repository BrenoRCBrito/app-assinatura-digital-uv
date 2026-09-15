import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import type { TestInstance } from 'test-renderer';

import { formatDateTime } from '../../domain/format';
import { SettingsProvider } from '../../storage/SettingsProvider';
import { criarDocumentoDeTeste } from '../../storage/testing/documentoAssinadoRepositoryContract';
import { lightTheme, tokens } from '../../theme';
import { DocumentoItem } from '../DocumentoItem';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const DOCUMENTO = criarDocumentoDeTeste('1757680000000', 'Contrato de locação', '2026-09-12T14:32:00.000Z');

function descendentes(no: TestInstance): TestInstance[] {
  return no.children.flatMap((filho) => (typeof filho === 'string' ? [] : [filho, ...descendentes(filho)]));
}

function estilo(no: TestInstance | null | undefined) {
  return StyleSheet.flatten(no?.props.style);
}

describe('DocumentoItem', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('mostra o título e a data com a cidade, e o toque chama a ação', async () => {
    const onPress = jest.fn();
    await render(<DocumentoItem documento={DOCUMENTO} onPress={onPress} />, { wrapper: SettingsProvider });

    await fireEvent.press(await screen.findByText('Contrato de locação'));

    expect(screen.getByText(`${formatDateTime(DOCUMENTO.assinadoEm)} · Vassouras`)).toBeTruthy();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('sem cidade, a data vem com as coordenadas', async () => {
    const semCidade = { ...DOCUMENTO, local: { ...DOCUMENTO.local, cidade: null } };
    await render(<DocumentoItem documento={semCidade} onPress={() => undefined} />, { wrapper: SettingsProvider });

    expect(await screen.findByText(`${formatDateTime(DOCUMENTO.assinadoEm)} · -22.40418, -43.66283`)).toBeTruthy();
  });

  test('a linha tem a altura do canvas, o ícone do documento na caixa e a seta apagada', async () => {
    await render(<DocumentoItem documento={DOCUMENTO} onPress={() => undefined} />, { wrapper: SettingsProvider });
    const linha = await screen.findByRole('button');
    const [icone, seta] = descendentes(linha).filter((no) => no.type === 'RNSVGSvgView');

    expect(estilo(linha)).toMatchObject({
      minHeight: tokens.size.documentItem,
      paddingHorizontal: tokens.inset.menuItemX,
      gap: tokens.gap.item,
    });
    expect(estilo(icone.parent)).toMatchObject({
      width: tokens.size.menuIconBox,
      height: tokens.size.menuIconBox,
      borderRadius: tokens.radius.menuIconBox,
      backgroundColor: lightTheme.background,
    });
    expect(descendentes(icone).filter((no) => no.type === 'RNSVGPath')).toHaveLength(3);
    expect([estilo(icone).width, estilo(seta).width]).toEqual([tokens.size.iconMenu, tokens.size.iconMenu]);
  });
});
