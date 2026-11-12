import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { DEFAULT_SETTINGS } from '../../domain/settings';
import { useAuthentication } from '../../hooks/useAuthentication';
import { excluirTodasAsPastasDeArquivos } from '../../services/fileSystem';
import { useRepositories } from '../../storage/RepositoriesProvider';
import type { Repositories } from '../../storage/repositories';
import { SettingsProvider } from '../../storage/SettingsProvider';
import { SETTINGS_STORAGE_KEY } from '../../storage/settingsStorage';
import { SettingsScreen } from '../SettingsScreen';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('../../hooks/useAuthentication', () => ({ useAuthentication: jest.fn() }));
jest.mock('../../storage/RepositoriesProvider', () => ({ useRepositories: jest.fn() }));
jest.mock('../../services/fileSystem', () => ({ excluirTodasAsPastasDeArquivos: jest.fn() }));

type BotoesDoAlerta = NonNullable<Parameters<typeof Alert.alert>[2]>;

const limparAssinaturas = jest.fn();
const limparDocumentos = jest.fn();
const limparUsuarios = jest.fn();
const limparCursores = jest.fn();
const sair = jest.fn();

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
    limparCursores.mockClear();
    sair.mockReset().mockResolvedValue(true);
    jest.mocked(excluirTodasAsPastasDeArquivos).mockClear();
    alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    jest.mocked(useAuthentication).mockReturnValue({ sair } as unknown as ReturnType<typeof useAuthentication>);
    jest.mocked(useRepositories).mockReturnValue({
      assinaturas: { clear: limparAssinaturas },
      documentos: { clear: limparDocumentos },
      usuarios: { clear: limparUsuarios },
      cursores: { clear: limparCursores },
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

  test('confirmar sai da conta e apaga os repositórios, o cursor de sincronização e as pastas de arquivos', async () => {
    const botao = await abrirConfiguracoes();

    await fireEvent.press(botao);
    await responderAlerta('Limpar');

    expect(sair).toHaveBeenCalledTimes(1);
    expect(limparAssinaturas).toHaveBeenCalledTimes(1);
    expect(limparDocumentos).toHaveBeenCalledTimes(1);
    expect(limparUsuarios).toHaveBeenCalledTimes(1);
    expect(limparCursores).toHaveBeenCalledTimes(1);
    expect(excluirTodasAsPastasDeArquivos).toHaveBeenCalledTimes(1);
  });

  test('sai da conta primeiro (que envia o que falta e pergunta) e só depois apaga o que sobrou', async () => {
    const ordem: string[] = [];
    sair.mockImplementation(async () => {
      ordem.push('sair');
      return true;
    });
    limparAssinaturas.mockImplementation(async () => {
      ordem.push('apagar');
    });
    const botao = await abrirConfiguracoes();

    await fireEvent.press(botao);
    await responderAlerta('Limpar');

    expect(ordem).toEqual(['sair', 'apagar']);
  });

  test('se a pessoa desiste de sair (havia dados sem enviar), nada é apagado', async () => {
    sair.mockResolvedValue(false);
    const botao = await abrirConfiguracoes();

    await fireEvent.press(botao);
    await responderAlerta('Limpar');

    expect(limparAssinaturas).not.toHaveBeenCalled();
    expect(limparDocumentos).not.toHaveBeenCalled();
    expect(limparUsuarios).not.toHaveBeenCalled();
    expect(limparCursores).not.toHaveBeenCalled();
    expect(excluirTodasAsPastasDeArquivos).not.toHaveBeenCalled();
  });

  test('confirmar também desliga a entrada por biometria da conta apagada e mantém as preferências', async () => {
    await AsyncStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        ...DEFAULT_SETTINGS,
        theme: 'dark',
        loginBiometricoAtivado: true,
        perguntaBiometriaRespondida: true,
        ultimoUsuarioIdBiometria: '1',
      }),
    );
    const botao = await abrirConfiguracoes();

    await fireEvent.press(botao);
    await responderAlerta('Limpar');

    await waitFor(async () => {
      expect(JSON.parse((await AsyncStorage.getItem(SETTINGS_STORAGE_KEY)) ?? '{}')).toEqual({
        ...DEFAULT_SETTINGS,
        theme: 'dark',
        loginBiometricoAtivado: false,
        perguntaBiometriaRespondida: false,
        ultimoUsuarioIdBiometria: null,
      });
    });
  });
});
