import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Dimensions, StyleSheet } from 'react-native';

import { createFraction, createSize } from '../../domain/geometry';
import { createFileUri } from '../../domain/photo';
import { SettingsProvider } from '../../storage/SettingsProvider';
import { criarAssinaturaDeTeste } from '../../storage/testing/assinaturaRepositoryContract';
import { tokens } from '../../theme';
import { VisualizadorDocumento } from '../VisualizadorDocumento';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

const SELO = { x: createFraction(0.4), y: createFraction(0.65), largura: createFraction(0.35) };
const DESENHO = criarAssinaturaDeTeste('1', 'Rubrica', '2026-09-12T12:00:00.000Z').desenho;

function renderizar(visible: boolean, onClose: () => void = jest.fn(), onCompartilhar: () => void = jest.fn()) {
  return render(
    <VisualizadorDocumento
      visible={visible}
      titulo="Contrato de locação"
      foto={createFileUri('file:///app/documentos/1/foto.jpg')}
      tamanhoFoto={createSize(3024, 4032)}
      desenho={DESENHO}
      selo={SELO}
      linhas={['12/09/2026 14:32', 'Vassouras']}
      onClose={onClose}
      onCompartilhar={onCompartilhar}
    />,
    { wrapper: SettingsProvider },
  );
}


describe('VisualizadorDocumento', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('fechado, não mostra o documento', async () => {
    await renderizar(false);

    expect(screen.queryByLabelText('Prévia do documento')).toBeNull();
  });

  test('aberto, mostra o título e a prévia ocupando a largura da tela', async () => {
    await renderizar(true);

    const previa = await screen.findByLabelText('Prévia do documento');

    expect(screen.getByText('Contrato de locação')).toBeTruthy();
    expect(StyleSheet.flatten(previa.props.style).width).toBe(
      Dimensions.get('window').width - tokens.inset.cameraX * 2,
    );
  });

  test('Fechar avisa quem abriu o visualizador', async () => {
    const onClose = jest.fn();
    await renderizar(true, onClose);

    await fireEvent.press(await screen.findByText('Fechar'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('Compartilhar avisa quem abriu o visualizador', async () => {
    const onCompartilhar = jest.fn();
    await renderizar(true, jest.fn(), onCompartilhar);

    await fireEvent.press(await screen.findByText('Compartilhar'));

    expect(onCompartilhar).toHaveBeenCalledTimes(1);
  });

});
