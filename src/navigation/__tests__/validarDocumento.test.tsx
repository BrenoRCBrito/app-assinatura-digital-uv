import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import App from '../../../App';
import { DEFAULT_SETTINGS } from '../../domain/settings';
import { criarEmail } from '../../domain/usuario';
import { authenticateDeviceOwner, getBiometricStatus } from '../../services/localAuthentication';
import { createRepositories } from '../../storage/createRepositories';
import { SETTINGS_STORAGE_KEY } from '../../storage/settingsStorage';


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
    render() {
      return null;
    }
  }

  return {
    CameraView,
    useCameraPermissions: () => [{ granted: true, canAskAgain: true }, jest.fn(), jest.fn()],
  };
});

const DICA = 'Aponte para o QR do documento';

describe('validação de documento na navegação', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await createRepositories('asyncStorage').usuarios.clear();
    jest.mocked(getBiometricStatus).mockResolvedValue('enrolled');
    jest.mocked(authenticateDeviceOwner).mockResolvedValue({ type: 'authenticated' });
  });


  test('do Login, abre o leitor sem entrar na conta e volta', async () => {
    await render(<App />);

    await fireEvent.press(await screen.findByText('Validar um documento'));
    expect(await screen.findByText(DICA)).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Fechar leitor'));
    await waitFor(() => expect(screen.queryByText(DICA)).toBeNull());
  });

  test('do Início, abre o leitor pela linha Validar documento', async () => {
    const usuario = await createRepositories('asyncStorage').usuarios.create({
      email: criarEmail('teste@exemplo.com'),
      senhaHash: 'hash',
    });
    await AsyncStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        ...DEFAULT_SETTINGS,
        loginBiometricoAtivado: true,
        perguntaBiometriaRespondida: true,
        ultimoUsuarioIdBiometria: usuario.id,
      }),
    );
    await render(<App />);

    await fireEvent.press(await screen.findByText('Acessar'));
    await fireEvent.press(await screen.findByText('Validar documento'));

    expect(await screen.findByText(DICA)).toBeTruthy();
  });
});
