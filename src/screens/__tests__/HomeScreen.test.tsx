import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { useAuthentication } from '../../hooks/useAuthentication';
import { SettingsProvider } from '../../storage/SettingsProvider';
import { HomeScreen } from '../HomeScreen';

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('../../hooks/useAuthentication', () => ({ useAuthentication: jest.fn() }));

const sair = jest.fn();

async function abrir() {
  await render(
    <HomeScreen
      onDigitalizarDocumento={jest.fn()}
      onOpenAssinaturas={jest.fn()}
      onOpenHistorico={jest.fn()}
      onValidarDocumento={jest.fn()}
      onOpenProfile={jest.fn()}
      onOpenSettings={jest.fn()}
    />,
    { wrapper: SettingsProvider },
  );
}

describe('HomeScreen', () => {
  beforeEach(() => {
    sair.mockReset();
    jest.mocked(useAuthentication).mockReturnValue({ sair } as unknown as ReturnType<typeof useAuthentication>);
  });

  test('o botão Sair da conta encerra a sessão', async () => {
    await abrir();

    await fireEvent.press(await screen.findByText('Sair da conta'));

    expect(sair).toHaveBeenCalledTimes(1);
  });

  test('não existe mais um Sair que só bloqueia', async () => {
    await abrir();

    await screen.findByText('Sair da conta');

    expect(screen.queryByText('Sair')).toBeNull();
  });
});
