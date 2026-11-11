import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import App from '../../../App';
import { DEFAULT_SETTINGS } from '../../domain/settings';
import { criarEmail, criarUsuarioId } from '../../domain/usuario';
import { contaDoFirebase } from '../../services/autenticacaoFirebase';
import { authenticateDeviceOwner, getBiometricStatus } from '../../services/localAuthentication';
import { createRepositories } from '../../storage/createRepositories';
import { SETTINGS_STORAGE_KEY } from '../../storage/settingsStorage';


jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('../../services/autenticacaoFirebase', () => ({
  cadastrarNoFirebase: jest.fn(),
  contaDoFirebase: jest.fn(),
  entrarNoFirebase: jest.fn(),
  sairDoFirebase: jest.fn(),
  mensagemDoErroDeAutenticacao: jest.fn(() => null),
}));
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
    await createRepositories('sqlite').usuarios.clear();
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
    const usuario = await createRepositories('sqlite').usuarios.create({
      id: criarUsuarioId('uid-teste'),
      email: criarEmail('teste@exemplo.com'),
    });
    jest.mocked(contaDoFirebase).mockResolvedValue({ uid: usuario.id, email: usuario.email });
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
