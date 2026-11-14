import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { createCapturedPhoto } from '../../domain/photo';
import { escolherDocumentoDaGaleria } from '../../services/documentoDaGaleria';
import { SettingsProvider } from '../../storage/SettingsProvider';
import { OrigemDoDocumentoDialog } from '../HomeScreen/OrigemDoDocumentoDialog';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('../../services/documentoDaGaleria', () => ({ escolherDocumentoDaGaleria: jest.fn() }));

const FOTO = createCapturedPhoto('file:///cache/manipulada.jpg', 3024, 4032);

async function abrir() {
  const props = { onClose: jest.fn(), onTirarFoto: jest.fn(), onFotoEscolhida: jest.fn() };
  await render(<OrigemDoDocumentoDialog visible {...props} />, { wrapper: SettingsProvider });
  return props;
}

describe('OrigemDoDocumentoDialog', () => {
  let alerta: jest.SpyInstance;

  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    alerta.mockRestore();
  });

  test('Tirar foto agora fecha o diálogo e vai para a câmera, sem abrir a galeria', async () => {
    const { onClose, onTirarFoto, onFotoEscolhida } = await abrir();

    await fireEvent.press(await screen.findByText('Tirar foto agora'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onTirarFoto).toHaveBeenCalledTimes(1);
    expect(escolherDocumentoDaGaleria).not.toHaveBeenCalled();
    expect(onFotoEscolhida).not.toHaveBeenCalled();
  });

  test('Escolher da galeria fecha o diálogo e segue com a foto escolhida', async () => {
    jest.mocked(escolherDocumentoDaGaleria).mockResolvedValue({ tipo: 'escolhida', foto: FOTO });
    const { onClose, onTirarFoto, onFotoEscolhida } = await abrir();

    await fireEvent.press(await screen.findByText('Escolher da galeria'));

    await waitFor(() => expect(onFotoEscolhida).toHaveBeenCalledWith(FOTO));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onTirarFoto).not.toHaveBeenCalled();
  });

  test('cancelar na galeria deixa o diálogo aberto, sem erro', async () => {
    jest.mocked(escolherDocumentoDaGaleria).mockResolvedValue({ tipo: 'cancelada' });
    const { onClose, onFotoEscolhida } = await abrir();

    await fireEvent.press(await screen.findByText('Escolher da galeria'));

    await waitFor(() => expect(escolherDocumentoDaGaleria).toHaveBeenCalledTimes(1));
    expect(onClose).not.toHaveBeenCalled();
    expect(onFotoEscolhida).not.toHaveBeenCalled();
    expect(alerta).not.toHaveBeenCalled();
  });

  test('sem permissão das fotos, avisa e oferece as configurações quando não dá para pedir de novo', async () => {
    jest.mocked(escolherDocumentoDaGaleria).mockResolvedValue({ tipo: 'semPermissao', podePedirDeNovo: false });
    const { onFotoEscolhida } = await abrir();

    await fireEvent.press(await screen.findByText('Escolher da galeria'));

    await waitFor(() => expect(alerta).toHaveBeenCalled());
    expect(alerta.mock.calls[0][1]).toBe('Permita o acesso às fotos para escolher a imagem do documento.');
    expect(alerta.mock.calls[0][2]).toContainEqual(expect.objectContaining({ text: 'Abrir configurações' }));
    expect(onFotoEscolhida).not.toHaveBeenCalled();
  });

  test('falha ao abrir a foto avisa o usuário e não segue', async () => {
    jest.mocked(escolherDocumentoDaGaleria).mockRejectedValue(new Error('imagem corrompida'));
    const erro = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { onClose, onFotoEscolhida } = await abrir();

    await fireEvent.press(await screen.findByText('Escolher da galeria'));

    await waitFor(() => expect(alerta).toHaveBeenCalled());
    expect(alerta.mock.calls[0][1]).toBe('Não foi possível usar a foto da galeria. Tente outra.');
    expect(onClose).not.toHaveBeenCalled();
    expect(onFotoEscolhida).not.toHaveBeenCalled();
    erro.mockRestore();
  });
});
