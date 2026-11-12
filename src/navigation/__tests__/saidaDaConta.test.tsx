import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { useAuthentication } from '../../hooks/useAuthentication';
import { SettingsProvider } from '../../storage/SettingsProvider';
import { AppNavigator } from '../AppNavigator';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('../../hooks/useAuthentication', () => ({ useAuthentication: jest.fn() }));
jest.mock('../../storage/RepositoriesProvider', () => ({ useRepositories: jest.fn(() => ({})) }));

function autenticacao(saindo: boolean) {
  jest.mocked(useAuthentication).mockReturnValue({
    isUnlocked: false,
    saindo,
    authenticating: false,
    biometricStatus: null,
    usuarioId: null,
    mostrarEntrarComBiometria: false,
    usuarioBiometria: null,
    loginComSenha: jest.fn(),
    cadastrar: jest.fn(),
    unlock: jest.fn(),
    sair: jest.fn(),
  });
}

describe('AppNavigator, saída da conta', () => {
  test('enquanto o app envia os últimos dados e limpa o aparelho, mostra "Enviando seus dados…"', async () => {
    autenticacao(true);

    await render(<AppNavigator />, { wrapper: SettingsProvider });

    expect(await screen.findByText('Enviando seus dados…')).toBeTruthy();
  });

  test('fora da saída, o aviso não aparece', async () => {
    autenticacao(false);

    await render(<AppNavigator />, { wrapper: SettingsProvider });

    expect(screen.queryByText('Enviando seus dados…')).toBeNull();
  });
});
