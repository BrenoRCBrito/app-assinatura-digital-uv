import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as MediaLibrary from 'expo-media-library';
import { Alert, Linking } from 'react-native';
import Toast from 'react-native-toast-message';

import { createCapturedPhoto } from '../../domain/photo';
import { DEFAULT_SETTINGS } from '../../domain/settings';
import { SettingsProvider } from '../../storage/SettingsProvider';
import { SETTINGS_STORAGE_KEY } from '../../storage/settingsStorage';
import { DigitalizarDocumentoScreen } from '../DigitalizarDocumentoScreen';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-camera', () => {
  const { Component } = require('react');

  class CameraView extends Component {
    componentDidMount() {
      if (mockCameraFalhaAoAbrir) {
        this.props.onMountError({ message: 'Câmera ocupada' });
      } else {
        this.props.onCameraReady();
      }
    }

    takePictureAsync(options: unknown) {
      return mockTirarFoto(options);
    }

    render() {
      return null;
    }
  }

  return { CameraView, useCameraPermissions: jest.fn() };
});

let mockCameraFalhaAoAbrir = false;
const mockTirarFoto = jest.fn();

const camera = jest.requireMock<{ useCameraPermissions: jest.Mock }>('expo-camera');

const galeria = MediaLibrary as unknown as Readonly<{
  requestPermissionsAsync: jest.Mock;
  Asset: Readonly<{ create: jest.Mock }>;
}>;

const FOTO_DA_CAMERA = { uri: 'file:///cache/foto.jpg', width: 3024, height: 4032, format: 'jpg' };
const FOTO = createCapturedPhoto('file:///cache/foto.jpg', 3024, 4032);
const COM_PERMISSAO = { granted: true, canAskAgain: true };

type Permissao = Readonly<{ granted: boolean; canAskAgain: boolean }> | null;

async function abrirTela(permissao: Permissao, { salvarCopiaNaGaleria = false } = {}) {
  await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, salvarCopiaNaGaleria }));
  const pedirPermissao = jest.fn().mockResolvedValue(permissao);
  camera.useCameraPermissions.mockReturnValue([permissao, pedirPermissao, jest.fn()]);
  const onFechar = jest.fn();
  const onUsarFoto = jest.fn();
  await render(<DigitalizarDocumentoScreen onFechar={onFechar} onUsarFoto={onUsarFoto} />, {
    wrapper: SettingsProvider,
  });
  return { onFechar, onUsarFoto, pedirPermissao };
}

async function fotografar() {
  await fireEvent.press(await screen.findByLabelText('Tirar foto'));
  await screen.findByText('Prévia');
}

describe('DigitalizarDocumentoScreen', () => {
  let toast: jest.SpyInstance;
  let alerta: jest.SpyInstance;

  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    mockCameraFalhaAoAbrir = false;
    mockTirarFoto.mockResolvedValue(FOTO_DA_CAMERA);
    toast = jest.spyOn(Toast, 'show').mockImplementation(() => undefined);
    alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    toast.mockRestore();
    alerta.mockRestore();
  });

  test('mostra o carregando enquanto confere a permissão', async () => {
    await abrirTela(null);

    expect(await screen.findByLabelText('Carregando')).toBeTruthy();
    expect(screen.queryByLabelText('Tirar foto')).toBeNull();
  });

  test('sem permissão, pede a câmera ou volta', async () => {
    const { onFechar, pedirPermissao } = await abrirTela({ granted: false, canAskAgain: true });

    await screen.findByText('O Assina Aqui precisa da câmera para fotografar o documento.');
    await fireEvent.press(screen.getByText('Permitir câmera'));
    await fireEvent.press(screen.getByText('Voltar'));

    expect(screen.getByText('Acesso à câmera')).toBeTruthy();
    expect(pedirPermissao).toHaveBeenCalledTimes(1);
    expect(onFechar).toHaveBeenCalledTimes(1);
  });

  test('com a câmera bloqueada, abre as configurações do aparelho', async () => {
    const abrirConfiguracoes = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    await abrirTela({ granted: false, canAskAgain: false });

    await screen.findByText('A câmera está bloqueada para o Assina Aqui. Libere o acesso nas configurações do aparelho.');
    await fireEvent.press(screen.getByText('Abrir configurações'));

    expect(abrirConfiguracoes).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Permitir câmera')).toBeNull();
    abrirConfiguracoes.mockRestore();
  });

  test('quando a câmera não abre, mostra o alerta e fecha a tela', async () => {
    const erro = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockCameraFalhaAoAbrir = true;
    const { onFechar } = await abrirTela(COM_PERMISSAO);

    await waitFor(() => expect(alerta).toHaveBeenCalledWith('Erro', 'Não foi possível abrir a câmera. Tente de novo.'));
    expect(onFechar).toHaveBeenCalledTimes(1);
    expect(erro).toHaveBeenCalledTimes(1);
    erro.mockRestore();
  });

  test('dois toques em Fechar câmera fecham a tela uma vez só', async () => {
    const { onFechar } = await abrirTela(COM_PERMISSAO);
    const fechar = await screen.findByLabelText('Fechar câmera');

    await fireEvent.press(fechar);
    await fireEvent.press(fechar);

    expect(onFechar).toHaveBeenCalledTimes(1);
  });

  test('Tirar outra fecha a prévia e mantém a câmera', async () => {
    await abrirTela(COM_PERMISSAO);

    await fotografar();
    await fireEvent.press(screen.getByText('Tirar outra'));

    expect(screen.queryByText('Prévia')).toBeNull();
    expect(screen.getByLabelText('Tirar foto')).toBeTruthy();
  });

  test('Usar foto sem a cópia na galeria abre o Posicionar com a foto, sem toast', async () => {
    const { onFechar, onUsarFoto } = await abrirTela(COM_PERMISSAO);

    await fotografar();
    await fireEvent.press(screen.getByText('Usar foto'));

    await waitFor(() => expect(onUsarFoto).toHaveBeenCalledWith(FOTO));
    expect(toast).not.toHaveBeenCalled();
    expect(onFechar).not.toHaveBeenCalled();
    expect(galeria.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  test('Usar foto com a cópia ligada salva a foto na galeria e abre o Posicionar', async () => {
    galeria.requestPermissionsAsync.mockResolvedValue({ granted: true });
    galeria.Asset.create.mockResolvedValue({});
    const { onUsarFoto } = await abrirTela(COM_PERMISSAO, { salvarCopiaNaGaleria: true });

    await fotografar();
    await fireEvent.press(screen.getByText('Usar foto'));

    await waitFor(() => expect(onUsarFoto).toHaveBeenCalledWith(FOTO));
    expect(galeria.Asset.create).toHaveBeenCalledWith('file:///cache/foto.jpg');
    expect(toast).not.toHaveBeenCalled();
  });

  test('quando a cópia falha, avisa com o toast informativo e abre o Posicionar', async () => {
    galeria.requestPermissionsAsync.mockResolvedValue({ granted: false });
    const { onUsarFoto } = await abrirTela(COM_PERMISSAO, { salvarCopiaNaGaleria: true });

    await fotografar();
    await fireEvent.press(screen.getByText('Usar foto'));

    await waitFor(() => expect(onUsarFoto).toHaveBeenCalledWith(FOTO));
    expect(toast).toHaveBeenCalledWith({ type: 'info', text1: 'Cópia não salva na galeria' });
    expect(galeria.Asset.create).not.toHaveBeenCalled();
  });

  test('Usar foto ignora o segundo toque enquanto salva a cópia', async () => {
    galeria.requestPermissionsAsync.mockReturnValue(new Promise(() => undefined));
    await abrirTela(COM_PERMISSAO, { salvarCopiaNaGaleria: true });

    await fotografar();
    await fireEvent.press(screen.getByText('Usar foto'));
    await fireEvent.press(screen.getByText('Usar foto'));

    expect(galeria.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  test('a falha ao tirar a foto mostra o alerta e deixa a câmera aberta', async () => {
    const erro = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockTirarFoto.mockRejectedValue(new Error('Câmera ocupada'));
    await abrirTela(COM_PERMISSAO);

    await fireEvent.press(await screen.findByLabelText('Tirar foto'));

    await waitFor(() => expect(alerta).toHaveBeenCalledWith('Erro', 'Não foi possível tirar a foto. Tente de novo.'));
    expect(screen.queryByText('Prévia')).toBeNull();
    expect(erro).toHaveBeenCalledTimes(1);
    erro.mockRestore();
  });
});
