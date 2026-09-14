import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { createCapturedPhoto } from '../../domain/photo';
import { SettingsProvider } from '../../storage/SettingsProvider';
import { FIXED_COLORS, tokens } from '../../theme';
import { DocumentCamera } from '../DocumentCamera';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-camera', () => {
  const { Component } = require('react');

  class CameraView extends Component {
    componentDidMount() {
      if (mockCameraFicaPronta) {
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

  return { CameraView };
});

let mockCameraFicaPronta = true;
const mockTirarFoto = jest.fn();

const FOTO_DA_CAMERA = { uri: 'file:///cache/foto.jpg', width: 3024, height: 4032, format: 'jpg' };

const DEDO_NA_TELA = {
  nativeEvent: { timestamp: 0, locationX: 1, locationY: 1, pageX: 1, pageY: 1, touches: [], changedTouches: [] },
  persist: jest.fn(),
  dispatchConfig: { registrationName: 'onResponderGrant' },
};

async function abrirCamera() {
  const acoes = { onClose: jest.fn(), onCapture: jest.fn(), onCaptureError: jest.fn() };
  await render(<DocumentCamera {...acoes} />, { wrapper: SettingsProvider });
  return { ...acoes, obturador: await screen.findByLabelText('Tirar foto') };
}

describe('DocumentCamera', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    mockCameraFicaPronta = true;
  });

  test('entrega a foto tirada com a qualidade do documento', async () => {
    mockTirarFoto.mockResolvedValue(FOTO_DA_CAMERA);
    const { onCapture, onCaptureError, obturador } = await abrirCamera();

    await fireEvent.press(obturador);

    await waitFor(() =>
      expect(onCapture).toHaveBeenCalledWith(createCapturedPhoto('file:///cache/foto.jpg', 3024, 4032)),
    );
    expect(mockTirarFoto).toHaveBeenCalledWith({ quality: 0.8 });
    expect(onCaptureError).not.toHaveBeenCalled();
  });

  test('não tira a foto antes de a câmera ficar pronta', async () => {
    mockCameraFicaPronta = false;
    const { obturador } = await abrirCamera();

    await fireEvent.press(obturador);

    expect(obturador.props.accessibilityState).toEqual({ disabled: true });
    expect(StyleSheet.flatten(obturador.props.style).opacity).toBe(tokens.opacity.disabled);
    expect(mockTirarFoto).not.toHaveBeenCalled();
  });

  test('ignora o segundo toque enquanto a foto é tirada', async () => {
    mockTirarFoto.mockReturnValue(new Promise(() => undefined));
    const { obturador } = await abrirCamera();

    await fireEvent.press(obturador);
    await fireEvent.press(obturador);

    expect(mockTirarFoto).toHaveBeenCalledTimes(1);
  });

  test.each([
    ['a câmera falha', () => Promise.reject(new Error('Câmera ocupada'))],
    ['a foto vem sem tamanho', () => Promise.resolve({ ...FOTO_DA_CAMERA, width: 0 })],
  ])('avisa a falha quando %s', async (_situacao, tirarFoto) => {
    mockTirarFoto.mockImplementation(tirarFoto);
    const { onCapture, onCaptureError, obturador } = await abrirCamera();

    await fireEvent.press(obturador);

    await waitFor(() => expect(onCaptureError).toHaveBeenCalledTimes(1));
    expect(onCapture).not.toHaveBeenCalled();
  });

  test('o obturador fica com a opacidade de pressionado', async () => {
    const { obturador } = await abrirCamera();

    await fireEvent(obturador, 'responderGrant', DEDO_NA_TELA);

    expect(StyleSheet.flatten(screen.getByLabelText('Tirar foto').props.style).opacity).toBe(tokens.opacity.pressed);
  });

  test('fechar é um botão redondo e translúcido sobre a câmera', async () => {
    const { onClose } = await abrirCamera();
    const fechar = screen.getByLabelText('Fechar câmera');

    expect(StyleSheet.flatten(fechar.props.style)).toMatchObject({
      width: tokens.size.touchTarget,
      height: tokens.size.touchTarget,
      borderRadius: tokens.radius.cameraControl,
      backgroundColor: FIXED_COLORS.cameraControl,
    });
    await fireEvent.press(fechar);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
