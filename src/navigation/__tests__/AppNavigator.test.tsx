import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { TestInstance } from 'test-renderer';

import App from '../../../App';
import { authenticateDeviceOwner, getBiometricStatus } from '../../services/localAuthentication';
import { createAsyncStorageAssinaturaRepository } from '../../storage/asyncStorage/asyncStorageAssinaturaRepository';
import { criarAssinaturaDeTeste } from '../../storage/testing/assinaturaRepositoryContract';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('../../services/localAuthentication', () => ({
  authenticateDeviceOwner: jest.fn(),
  getBiometricStatus: jest.fn(),
}));
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

function descendentes(no: TestInstance): TestInstance[] {
  return no.children.flatMap((filho) => (typeof filho === 'string' ? [] : [filho, ...descendentes(filho)]));
}

function telasDaPilha(): TestInstance[] {
  return descendentes(screen.container).filter((no) => no.type === 'RNSScreen');
}

describe('AppNavigator', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.mocked(getBiometricStatus).mockResolvedValue('enrolled');
    jest.mocked(authenticateDeviceOwner).mockResolvedValue({ type: 'authenticated' });
  });

  test('Usar foto troca a câmera pelo Posicionar, sem o gesto de voltar do iOS', async () => {
    await createAsyncStorageAssinaturaRepository().save(
      criarAssinaturaDeTeste('1', 'Rubrica', '2026-09-12T12:00:00.000Z'),
    );
    await render(<App />);
    await fireEvent.press(await screen.findByText('Entrar'));
    await fireEvent.press(await screen.findByText('Digitalizar documento'));
    await fireEvent.press(await screen.findByLabelText('Tirar foto'));
    await fireEvent.press(await screen.findByText('Usar foto'));
    await screen.findByRole('radio', { name: 'Rubrica' });

    const pilha = telasDaPilha();

    expect(pilha).toHaveLength(2);
    expect(pilha.at(-1)?.props.gestureEnabled).toBe(false);
  });
});
