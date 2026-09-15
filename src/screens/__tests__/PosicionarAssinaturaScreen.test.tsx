import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert, StyleSheet } from 'react-native';

import { criarDesenho, criarTraco } from '../../domain/desenho';
import { createFraction, createSize, fitSizeInside } from '../../domain/geometry';
import { createCapturedPhoto, type CapturedPhoto } from '../../domain/photo';
import { layoutDoSelo, seloNaFoto } from '../../domain/selo';
import { useAssinarDocumento } from '../../hooks/useAssinarDocumento';
import {
  ASSINATURAS_STORAGE_KEY,
  createAsyncStorageAssinaturaRepository,
} from '../../storage/asyncStorage/asyncStorageAssinaturaRepository';
import { RepositoriesProvider } from '../../storage/RepositoriesProvider';
import { SettingsProvider } from '../../storage/SettingsProvider';
import { criarAssinaturaDeTeste } from '../../storage/testing/assinaturaRepositoryContract';
import { criarDocumentoDeTeste } from '../../storage/testing/documentoAssinadoRepositoryContract';
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
jest.mock('../../hooks/useAssinarDocumento', () => ({ useAssinarDocumento: jest.fn() }));

const FOTO = createCapturedPhoto('file:///cache/foto.jpg', 600, 800);
const PALCO_MEDIDO = { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 300 } } };
const RUBRICA = criarAssinaturaDeTeste('2', 'Rubrica', '2026-09-12T10:00:00.000Z');

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
  await repositorio.save(RUBRICA);
}

async function abrirTela(foto: CapturedPhoto = FOTO) {
  const onNovaAssinatura = jest.fn();
  const onAssinado = jest.fn();
  await render(
    <PosicionarAssinaturaScreen foto={foto} onNovaAssinatura={onNovaAssinatura} onAssinado={onAssinado} />,
    { wrapper: Provedores },
  );
  return { onNovaAssinatura, onAssinado };
}

async function darTituloEAssinar() {
  await fireEvent.changeText(await screen.findByLabelText('Título do documento'), 'Contrato de locação');
  await fireEvent.press(await screen.findByText('Assinar'));
}

describe('PosicionarAssinaturaScreen', () => {
  const assinar = jest.fn();

  beforeEach(async () => {
    await AsyncStorage.clear();
    assinar.mockReset();
    jest.mocked(useAssinarDocumento).mockReturnValue({ assinando: false, assinar });
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
    expect(screen.getByText('40%')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByLabelText('Selo da assinatura').props.style)).toMatchObject({
      width: layoutDoSelo(createFraction(0.4), area, RUBRICA.desenho.quadro).tamanho.width,
    });

    await fireEvent.press(screen.getByLabelText('Diminuir o selo'));
    await fireEvent.press(screen.getByLabelText('Diminuir o selo'));
    expect(screen.getByText('30%')).toBeTruthy();
  });

  test('com foto deitada e assinatura alta, o passo para quando o selo chega à altura da foto', async () => {
    const fotoDeitada = createCapturedPhoto('file:///cache/foto.jpg', 4032, 3024);
    await createAsyncStorageAssinaturaRepository().save({
      ...criarAssinaturaDeTeste('1', 'Rubrica alta', '2026-09-12T10:00:00.000Z'),
      desenho: criarDesenho([criarTraco('M10,20 L30,40')], createSize(300, 400)),
    });
    await abrirTela(fotoDeitada);
    await screen.findByText('35%');
    await fireEvent(screen.getByLabelText('Palco do documento'), 'layout', PALCO_MEDIDO);

    await fireEvent.press(screen.getByLabelText('Aumentar o selo'));
    await fireEvent.press(screen.getByLabelText('Aumentar o selo'));
    await fireEvent.press(screen.getByLabelText('Aumentar o selo'));

    const area = fitSizeInside(fotoDeitada.size, createSize(300, 300));
    const selo = StyleSheet.flatten(screen.getByLabelText('Selo da assinatura').props.style);
    expect(screen.getByText('47%')).toBeTruthy();
    expect(screen.getByLabelText('Aumentar o selo').props.accessibilityState).toEqual({ disabled: true });
    expect(selo.height).toBeLessThanOrEqual(area.height);
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
    expect(screen.queryByText('Assinar')).toBeNull();
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

  test('sem título, pede para conferir o título e não assina', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await salvarAssinaturas();
    await abrirTela();

    await fireEvent.press(await screen.findByText('Assinar'));

    expect(alerta).toHaveBeenCalledWith('Confira o título', 'Dê um título ao documento.');
    expect(assinar).not.toHaveBeenCalled();
    alerta.mockRestore();
  });

  test('Assinar manda o pedido com o selo na largura atual e abre o documento', async () => {
    assinar.mockResolvedValue({
      tipo: 'assinado',
      documento: criarDocumentoDeTeste('1757680000000', 'Contrato de locação', '2026-09-12T14:32:00.000Z'),
    });
    await salvarAssinaturas();
    const { onAssinado } = await abrirTela();

    await fireEvent.press(await screen.findByLabelText('Aumentar o selo'));
    await darTituloEAssinar();

    expect(assinar).toHaveBeenCalledWith({
      titulo: 'Contrato de locação',
      assinatura: RUBRICA,
      foto: FOTO,
      selo: seloNaFoto(null, createFraction(0.4), FOTO.size, RUBRICA.desenho.quadro),
    });
    await waitFor(() => expect(onAssinado).toHaveBeenCalledWith('1757680000000'));
  });

  test('sem permissão de local, oferece abrir as configurações', async () => {
    const alerta: jest.SpyInstance = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    assinar.mockResolvedValue({ tipo: 'falhou', motivo: 'localSemPermissao' });
    await salvarAssinaturas();
    await abrirTela();

    await darTituloEAssinar();

    await waitFor(() => expect(alerta).toHaveBeenCalledTimes(1));
    const [titulo, mensagem, botoes] = alerta.mock.calls[0];
    expect([titulo, mensagem]).toEqual([
      'Não foi possível assinar',
      'O local é obrigatório para assinar. Permita o acesso à localização.',
    ]);
    expect(botoes.map((botao: { text: string }) => botao.text)).toEqual(['Fechar', 'Abrir configurações']);
    alerta.mockRestore();
  });

  test('outra falha mostra a mensagem do motivo', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    assinar.mockResolvedValue({ tipo: 'falhou', motivo: 'erroAoGerarDocumento' });
    await salvarAssinaturas();
    await abrirTela();

    await darTituloEAssinar();

    await waitFor(() =>
      expect(alerta).toHaveBeenCalledWith(
        'Não foi possível assinar',
        'Não foi possível gerar o documento. Tente de novo.',
      ),
    );
    alerta.mockRestore();
  });

  test('cancelar a biometria não mostra nada e fica no Posicionar', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    assinar.mockResolvedValue({ tipo: 'cancelado' });
    await salvarAssinaturas();
    const { onAssinado } = await abrirTela();

    await darTituloEAssinar();
    await assinar.mock.results[0].value;

    expect(alerta).not.toHaveBeenCalled();
    expect(onAssinado).not.toHaveBeenCalled();
    alerta.mockRestore();
  });

  test('enquanto assina, cobre a tela com o aviso e deixa o botão Assinando… desativado', async () => {
    jest.mocked(useAssinarDocumento).mockReturnValue({ assinando: true, assinar });
    await salvarAssinaturas();
    await abrirTela();

    const botao = await screen.findByRole('button', { name: 'Assinando…' });

    expect(botao.props.accessibilityState).toEqual({ disabled: true });
    expect(screen.getByText('Assinando o documento…')).toBeTruthy();
  });

  test('sem assinatura em andamento, não mostra o aviso', async () => {
    await salvarAssinaturas();
    await abrirTela();

    await screen.findByText('Assinar');

    expect(screen.queryByText('Assinando o documento…')).toBeNull();
  });
});
