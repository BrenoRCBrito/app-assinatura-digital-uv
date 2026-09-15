import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';

import {
  createAsyncStorageDocumentoAssinadoRepository,
  DOCUMENTOS_STORAGE_KEY,
} from '../../storage/asyncStorage/asyncStorageDocumentoAssinadoRepository';
import { RepositoriesProvider } from '../../storage/RepositoriesProvider';
import { SettingsProvider } from '../../storage/SettingsProvider';
import { criarDocumentoDeTeste } from '../../storage/testing/documentoAssinadoRepositoryContract';
import { HistoricoScreen } from '../HistoricoScreen';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    ...jest.requireActual('@react-navigation/native'),
    useFocusEffect: (efeito: () => void) => useEffect(efeito, [efeito]),
  };
});

const MENSAGEM_VAZIA = 'Nenhum documento assinado. Toque em Digitalizar documento no Início para assinar o primeiro.';
const ANTIGO = criarDocumentoDeTeste('1757500000000', 'Termo de estágio', '2026-09-10T09:15:00.000Z');
const NOVO = criarDocumentoDeTeste('1757680000000', 'Contrato de locação', '2026-09-12T14:32:00.000Z');

function Provedores({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <SettingsProvider>
      <RepositoriesProvider>{children}</RepositoriesProvider>
    </SettingsProvider>
  );
}

async function abrirHistorico() {
  const onAbrirDocumento = jest.fn();
  await render(<HistoricoScreen onAbrirDocumento={onAbrirDocumento} />, { wrapper: Provedores });
  return { onAbrirDocumento };
}

describe('HistoricoScreen', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('sem documentos, mostra a mensagem de vazio', async () => {
    await abrirHistorico();

    expect(await screen.findByText(MENSAGEM_VAZIA)).toBeTruthy();
  });

  test('lista do mais novo para o mais antigo e abre o documento tocado', async () => {
    const repositorio = createAsyncStorageDocumentoAssinadoRepository();
    await repositorio.save(ANTIGO);
    await repositorio.save(NOVO);
    const { onAbrirDocumento } = await abrirHistorico();

    await screen.findByText('Contrato de locação');
    const titulos = screen.getAllByText(/^(Contrato de locação|Termo de estágio)$/).map((texto) => texto.children[0]);
    await fireEvent.press(screen.getByText('Termo de estágio'));

    expect(titulos).toEqual(['Contrato de locação', 'Termo de estágio']);
    expect(onAbrirDocumento).toHaveBeenCalledWith(ANTIGO.id);
  });

  test('falha ao carregar mostra o erro e a lista vazia', async () => {
    const erro = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await AsyncStorage.setItem(DOCUMENTOS_STORAGE_KEY, '[{"id":');
    await abrirHistorico();

    expect(await screen.findByText(MENSAGEM_VAZIA)).toBeTruthy();
    expect(alerta).toHaveBeenCalledWith('Erro', 'Não foi possível carregar os dados.');
    expect(erro).toHaveBeenCalledTimes(1);
    alerta.mockRestore();
    erro.mockRestore();
  });
});
