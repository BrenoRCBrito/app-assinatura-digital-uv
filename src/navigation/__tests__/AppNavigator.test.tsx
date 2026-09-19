import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import type { TestInstance } from 'test-renderer';

import App from '../../../App';
import { useAssinarDocumento } from '../../hooks/useAssinarDocumento';
import { authenticateDeviceOwner, getBiometricStatus } from '../../services/localAuthentication';
import { createAsyncStorageAssinaturaRepository } from '../../storage/asyncStorage/asyncStorageAssinaturaRepository';
import {
  createAsyncStorageDocumentoAssinadoRepository,
} from '../../storage/asyncStorage/asyncStorageDocumentoAssinadoRepository';
import { criarDocumentoDeTeste } from '../../storage/testing/documentoAssinadoRepositoryContract';
import { DEFAULT_SETTINGS } from '../../domain/settings';
import { SETTINGS_STORAGE_KEY } from '../../storage/settingsStorage';
import { criarAssinaturaDeTeste, USUARIO_DE_TESTE } from '../../storage/testing/assinaturaRepositoryContract';


jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('../../services/localAuthentication', () => ({
  authenticateDeviceOwner: jest.fn(),
  getBiometricStatus: jest.fn(),
}));
jest.mock('../../services/fileSystem', () => ({
  ...jest.requireActual('../../services/fileSystem'),
  excluirArquivosDocumento: jest.fn(),
}));
jest.mock('../../hooks/useAssinarDocumento', () => ({ useAssinarDocumento: jest.fn() }));
jest.mock('expo-camera', () => {
  const { Component } = require('react');

  class CameraView extends Component {
    componentDidMount() {
      this.props.onCameraReady();
    }

    takePictureAsync() {
      return Promise.resolve({ uri: 'file:///cache/foto.jpg', width: 3024, height: 4032, format: 'jpg' });
    }

    render() {
      return null;
    }
  }

  return {
    CameraView,
    useCameraPermissions: () => [{ granted: true, canAskAgain: true }, jest.fn(), jest.fn()],
  };
});

const DOCUMENTO = criarDocumentoDeTeste('1757680000000', 'Contrato de locação', '2026-09-12T14:32:00.000Z');
const HISTORICO_VAZIO = 'Nenhum documento assinado. Toque em Digitalizar documento no Início para assinar o primeiro.';

function descendentes(no: TestInstance): TestInstance[] {
  return no.children.flatMap((filho) => (typeof filho === 'string' ? [] : [filho, ...descendentes(filho)]));
}

function telasDaPilha(): TestInstance[] {
  return descendentes(screen.container).filter((no) => no.type === 'RNSScreen');
}

async function abrirPosicionar() {
  await createAsyncStorageAssinaturaRepository().save(
    criarAssinaturaDeTeste('1', 'Rubrica', '2026-09-12T12:00:00.000Z'),
  );
  await render(<App />);
  await fireEvent.press(await screen.findByText('Entrar com biometria'));
  await fireEvent.press(await screen.findByText('Digitalizar documento'));
  await fireEvent.press(await screen.findByLabelText('Tirar foto'));
  await fireEvent.press(await screen.findByText('Usar foto'));
  await screen.findByRole('radio', { name: 'Rubrica' });
}

async function abrirDocumentoPeloHistorico() {
  await createAsyncStorageDocumentoAssinadoRepository().save(DOCUMENTO);
  await render(<App />);
  await fireEvent.press(await screen.findByText('Entrar com biometria'));
  await fireEvent.press(await screen.findByText('Histórico'));
  await fireEvent.press(await screen.findByText('Contrato de locação'));
  await screen.findByText('PDF A4, 1 página');
}

describe('AppNavigator', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        ...DEFAULT_SETTINGS,
        loginBiometricoAtivado: true,
        perguntaBiometriaRespondida: true,
        ultimoUsuarioIdBiometria: USUARIO_DE_TESTE,
      }),
    );
    jest.mocked(getBiometricStatus).mockResolvedValue('enrolled');
    jest.mocked(authenticateDeviceOwner).mockResolvedValue({ type: 'authenticated' });
    jest.mocked(useAssinarDocumento).mockReturnValue({
      assinando: false,
      assinar: jest.fn().mockResolvedValue({ tipo: 'assinado', documento: DOCUMENTO }),
    });
});

  test('Usar foto troca a câmera pelo Posicionar, sem o gesto de voltar do iOS', async () => {
    await abrirPosicionar();

    const pilha = telasDaPilha();

    expect(pilha).toHaveLength(2);
    expect(pilha.at(-1)?.props.gestureEnabled).toBe(false);
  });

  test('Assinar troca o Posicionar pelo documento assinado', async () => {
    await createAsyncStorageDocumentoAssinadoRepository().save(DOCUMENTO);
    await abrirPosicionar();

    await fireEvent.changeText(screen.getByLabelText('Título do documento'), 'Contrato de locação');
    await fireEvent.press(screen.getByText('Assinar'));

    await screen.findByText('PDF A4, 1 página');
    expect(telasDaPilha()).toHaveLength(2);
  });

  test('o Histórico do Início abre o documento assinado por cima da lista', async () => {
    await abrirDocumentoPeloHistorico();

    expect(telasDaPilha()).toHaveLength(3);
  });

  test('Excluir no documento volta ao Histórico sem o documento', async () => {
    const alerta: jest.SpyInstance = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await abrirDocumentoPeloHistorico();

    await fireEvent.press(screen.getByText('Excluir documento'));
    const [, , botoes] = alerta.mock.calls[0];
    botoes[1].onPress();

    expect(await screen.findByText(HISTORICO_VAZIO)).toBeTruthy();
    expect(telasDaPilha()).toHaveLength(2);
    alerta.mockRestore();
  });
});
