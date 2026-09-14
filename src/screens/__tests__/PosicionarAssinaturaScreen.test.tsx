import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert, StyleSheet } from 'react-native';

import { createFraction, createSize, fitSizeInside } from '../../domain/geometry';
import { createCapturedPhoto } from '../../domain/photo';
import { layoutDoSelo } from '../../domain/selo';
import {
  ASSINATURAS_STORAGE_KEY,
  createAsyncStorageAssinaturaRepository,
} from '../../storage/asyncStorage/asyncStorageAssinaturaRepository';
import { RepositoriesProvider } from '../../storage/RepositoriesProvider';
import { SettingsProvider } from '../../storage/SettingsProvider';
import { criarAssinaturaDeTeste } from '../../storage/testing/assinaturaRepositoryContract';
import { PosicionarAssinaturaScreen } from '../PosicionarAssinaturaScreen';

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

const FOTO = createCapturedPhoto('file:///cache/foto.jpg', 600, 800);
const PALCO_MEDIDO = { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 300 } } };

function Provedores({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <SettingsProvider>
      <RepositoriesProvider>{children}</RepositoriesProvider>
    </SettingsProvider>
  );
}

async function salvarAssinaturas() {
  const repositorio = createAsyncStorageAssinaturaRepository();
  await repositorio.save(criarAssinaturaDeTeste('1', 'Assinatura completa', '2026-09-10T10:00:00.000Z'));
  await repositorio.save(criarAssinaturaDeTeste('2', 'Rubrica', '2026-09-12T10:00:00.000Z'));
}

async function abrirTela() {
  const onNovaAssinatura = jest.fn();
  await render(<PosicionarAssinaturaScreen foto={FOTO} onNovaAssinatura={onNovaAssinatura} />, {
    wrapper: Provedores,
  });
  return { onNovaAssinatura };
}

describe('PosicionarAssinaturaScreen', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('com assinaturas, escolhe a mais nova e mostra o selo com a data de agora', async () => {
    await salvarAssinaturas();
    await abrirTela();

    const rubrica = await screen.findByRole('radio', { name: 'Rubrica' });
    await fireEvent(screen.getByLabelText('Palco do documento'), 'layout', PALCO_MEDIDO);

    expect(rubrica.props.accessibilityState).toEqual({ checked: true });
    expect(screen.getByText('Local ao assinar')).toBeTruthy();
    expect(screen.getByText(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/)).toBeTruthy();
    expect(screen.getByText('Arraste o selo até a linha de assinatura.')).toBeTruthy();
    expect(screen.getByLabelText('Título do documento')).toBeTruthy();
  });

  test('escolher outra assinatura marca a ficha dela', async () => {
    await salvarAssinaturas();
    await abrirTela();

    await fireEvent.press(await screen.findByText('Assinatura completa'));

    expect(screen.getByRole('radio', { name: 'Assinatura completa' }).props.accessibilityState).toEqual({
      checked: true,
    });
  });

  test('o passo muda o tamanho do selo em 5%', async () => {
    await salvarAssinaturas();
    await abrirTela();
    await screen.findByText('35%');
    await fireEvent(screen.getByLabelText('Palco do documento'), 'layout', PALCO_MEDIDO);

    await fireEvent.press(screen.getByLabelText('Aumentar o selo'));

    const area = fitSizeInside(FOTO.size, createSize(300, 300));
    const quadro = criarAssinaturaDeTeste('2', 'Rubrica', '2026-09-12T10:00:00.000Z').desenho.quadro;
    expect(screen.getByText('40%')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByLabelText('Selo da assinatura').props.style)).toMatchObject({
      width: layoutDoSelo(createFraction(0.4), area, quadro).tamanho.width,
    });

    await fireEvent.press(screen.getByLabelText('Diminuir o selo'));
    await fireEvent.press(screen.getByLabelText('Diminuir o selo'));
    expect(screen.getByText('30%')).toBeTruthy();
  });

  test('sem assinatura salva, pergunta antes de abrir Nova assinatura', async () => {
    const alerta: jest.SpyInstance = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { onNovaAssinatura } = await abrirTela();

    await waitFor(() => expect(alerta).toHaveBeenCalledTimes(1));
    const [titulo, mensagem, botoes] = alerta.mock.calls[0];
    botoes[1].onPress();
    await fireEvent.press(screen.getByText('Nova assinatura'));

    expect([titulo, mensagem]).toEqual([
      'Nenhuma assinatura salva',
      'Desenhe uma assinatura para posicionar no documento.',
    ]);
    expect(screen.getByText('Nenhuma assinatura salva.')).toBeTruthy();
    expect(screen.queryByLabelText('Palco do documento')).toBeNull();
    expect(screen.queryByText('Arraste o selo até a linha de assinatura.')).toBeNull();
    expect(onNovaAssinatura).toHaveBeenCalledTimes(2);
    alerta.mockRestore();
  });

  test('se a lista não carrega, mostra o erro e não pergunta', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const erro = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await AsyncStorage.setItem(ASSINATURAS_STORAGE_KEY, '{corrompido');
    await abrirTela();

    await screen.findByText('Nenhuma assinatura salva.');

    expect(alerta.mock.calls).toEqual([['Erro', 'Não foi possível carregar os dados.']]);
    expect(erro).toHaveBeenCalledTimes(1);
    alerta.mockRestore();
    erro.mockRestore();
  });
});
