/// <reference types="node" />
import React from 'react';
import { createHmac } from 'node:crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { camposDoDocumento, emitirCodigo, type Carimbar } from '../../domain/codigoDeAutenticidade';
import { criarEmail } from '../../domain/usuario';
import { carimbarComOSegredoDoApp } from '../../services/carimbo';
import { SettingsProvider } from '../../storage/SettingsProvider';
import { criarDocumentoDeTeste } from '../../storage/testing/documentoAssinadoRepositoryContract';
import { ValidarDocumentoScreen } from '../ValidarDocumentoScreen';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('../../services/carimbo', () => ({ carimbarComOSegredoDoApp: jest.fn() }));
jest.mock('expo-camera', () => {
  const { Component } = require('react');

  class CameraView extends Component {
    componentDidMount() {
      mockCamera.atual = this as unknown as CameraSimulada;
    }

    componentDidUpdate() {
      mockCamera.atual = this as unknown as CameraSimulada;
    }

    componentWillUnmount() {
      mockCamera.atual = null;
    }

    render() {
      return null;
    }
  }

  return { CameraView, useCameraPermissions: jest.fn() };
});

type CameraSimulada = Readonly<{
  props: Readonly<{ onBarcodeScanned?: (resultado: Readonly<{ data: string; type: string }>) => void }>;
}>;

const mockCamera: { atual: CameraSimulada | null } = { atual: null };
const camera = jest.requireMock<{ useCameraPermissions: jest.Mock }>('expo-camera');
const carimbarDeTeste: Carimbar = async (mensagem) =>
  createHmac('sha256', 'segredo-de-teste').update(mensagem).digest('base64url');
const DOCUMENTO = criarDocumentoDeTeste('1757680000000', 'Contrato de locação', '2026-09-12T14:32:00.000Z');
const DICA = 'Aponte para o QR do documento';

async function abrirTela(permissao = { granted: true, canAskAgain: true }) {
  camera.useCameraPermissions.mockReturnValue([permissao, jest.fn(), jest.fn()]);
  const onFechar = jest.fn();
  await render(<ValidarDocumentoScreen onFechar={onFechar} />, { wrapper: SettingsProvider });
  return { onFechar };
}

async function lerQr(...textos: string[]) {
  await act(async () => {
    for (const texto of textos) {
      mockCamera.atual?.props.onBarcodeScanned?.({ data: texto, type: 'qr' });
    }
  });
}

function codigoValido() {
  return emitirCodigo(camposDoDocumento(DOCUMENTO, criarEmail('breno@exemplo.com'), 'a'.repeat(64)), carimbarDeTeste);
}

describe('ValidarDocumentoScreen', () => {
  let alerta: jest.SpyInstance;

  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    jest.mocked(carimbarComOSegredoDoApp).mockImplementation(carimbarDeTeste);
    alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    alerta.mockRestore();
  });

  test('código autêntico mostra quem assinou, o título, a data e o local, sem o resumo da foto', async () => {
    await abrirTela();
    await screen.findByText(DICA);

    await lerQr(await codigoValido());

    expect(await screen.findByText('Documento autêntico')).toBeTruthy();
    expect(screen.getByText('breno@exemplo.com')).toBeTruthy();
    expect(screen.getByText('Contrato de locação')).toBeTruthy();
    expect(screen.getByText('-22.40418, -43.66283')).toBeTruthy();
    expect(screen.queryByText('a'.repeat(64))).toBeNull();
  });

  test('código que não confere com o carimbo mostra só o veredicto, sem os dados', async () => {
    await abrirTela();
    await screen.findByText(DICA);

    await lerQr((await codigoValido()).replace('Contrato', 'Contrata'));

    expect(await screen.findByText('Código não autenticado')).toBeTruthy();
    expect(screen.getByText(/pode ter sido alterado ou emitido com outro segredo/)).toBeTruthy();
    expect(screen.queryByText('breno@exemplo.com')).toBeNull();
  });

  test('QR de outro app não é reconhecido', async () => {
    await abrirTela();
    await screen.findByText(DICA);

    await lerQr('https://exemplo.com/documento');

    expect(await screen.findByText('Código não reconhecido')).toBeTruthy();
  });

  test('confere uma vez só quando o leitor dispara várias vezes seguidas', async () => {
    await abrirTela();
    await screen.findByText(DICA);
    const codigo = await codigoValido();

    await lerQr(codigo, codigo, codigo);

    expect(await screen.findByText('Documento autêntico')).toBeTruthy();
    expect(carimbarComOSegredoDoApp).toHaveBeenCalledTimes(1);
  });

  test('Ler outro volta ao leitor e aceita um código novo', async () => {
    await abrirTela();
    await screen.findByText(DICA);
    await lerQr('https://exemplo.com/documento');
    await screen.findByText('Código não reconhecido');

    await fireEvent.press(screen.getByText('Ler outro'));
    await screen.findByText(DICA);
    await lerQr(await codigoValido());

    expect(await screen.findByText('Documento autêntico')).toBeTruthy();
  });

  test('sem segredo no aparelho, avisa o erro e continua lendo', async () => {
    const erro = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.mocked(carimbarComOSegredoDoApp).mockRejectedValueOnce(new Error('Segredo do carimbo ausente'));
    await abrirTela();
    await screen.findByText(DICA);

    await lerQr(await codigoValido());

    expect(alerta).toHaveBeenCalledWith('Erro', 'Não foi possível conferir o código neste aparelho.');
    expect(screen.getByText(DICA)).toBeTruthy();
    await lerQr(await codigoValido());
    expect(await screen.findByText('Documento autêntico')).toBeTruthy();
    erro.mockRestore();
  });

  test('sem permissão, pede a câmera antes de ler', async () => {
    await abrirTela({ granted: false, canAskAgain: true });

    expect(await screen.findByText('Permitir câmera')).toBeTruthy();
  });

  test('fechar o leitor sai da tela', async () => {
    const { onFechar } = await abrirTela();

    await fireEvent.press(await screen.findByLabelText('Fechar leitor'));

    expect(onFechar).toHaveBeenCalledTimes(1);
  });
});
