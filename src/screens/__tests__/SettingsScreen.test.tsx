import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { useAuthentication } from '../../hooks/useAuthentication';
import { useRepositories } from '../../storage/RepositoriesProvider';
import type { Repositories } from '../../storage/repositories';
import { SettingsProvider } from '../../storage/SettingsProvider';
import { SettingsScreen } from '../SettingsScreen';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('../../hooks/useAuthentication', () => ({ useAuthentication: jest.fn() }));
jest.mock('../../storage/RepositoriesProvider', () => ({ useRepositories: jest.fn() }));

type BotoesDoAlerta = NonNullable<Parameters<typeof Alert.alert>[2]>;

const limparAssinaturas = jest.fn();
const limparDocumentos = jest.fn();
const limparUsuarios = jest.fn();
const lock = jest.fn();

async function abrirConfiguracoes() {
  await render(<SettingsScreen />, { wrapper: SettingsProvider });
  return screen.findByText('Limpar dados do app');
}

async function responderAlerta(texto: string) {
  const chamada = jest.mocked(Alert.alert).mock.calls.at(-1);
  const botoes = (chamada?.[2] ?? []) as BotoesDoAlerta;
  await act(async () => {
    botoes.find((botao) => botao.text === texto)?.onPress?.();
  });
}

describe('SettingsScreen', () => {
  let alerta: jest.SpyInstance;

  beforeEach(async () => {
    await AsyncStorage.clear();
    limparAssinaturas.mockClear();
    limparDocumentos.mockClear();
    limparUsuarios.mockClear();
    lock.mockClear();
    alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    jest.mocked(useAuthentication).mockReturnValue({ lock } as unknown as ReturnType<typeof useAuthentication>);
    jest.mocked(useRepositories).mockReturnValue({
      assinaturas: { clear: limparAssinaturas },
      documentos: { clear: limparDocumentos },
      usuarios: { clear: limparUsuarios },
    } as unknown as Repositories);
  });

  afterEach(() => {
    alerta.mockRestore();
  });

  test('pergunta antes de limpar e não apaga nada quando o usuário cancela', async () => {
    const botao = await abrirConfiguracoes();

    await fireEvent.press(botao);

    expect(alerta).toHaveBeenCalledTimes(1);
    expect(limparAssinaturas).not.toHaveBeenCalled();
    expect(limparDocumentos).not.toHaveBeenCalled();
    expect(limparUsuarios).not.toHaveBeenCalled();
  });

  test('confirmar apaga os três repositórios e tranca o app', async () => {
    const botao = await abrirConfiguracoes();

    await fireEvent.press(botao);
    await responderAlerta('Limpar');

    expect(limparAssinaturas).toHaveBeenCalledTimes(1);
    expect(limparDocumentos).toHaveBeenCalledTimes(1);
    expect(limparUsuarios).toHaveBeenCalledTimes(1);
    expect(lock).toHaveBeenCalledTimes(1);
  });
});
