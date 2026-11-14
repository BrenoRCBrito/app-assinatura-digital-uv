import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { createCapturedPhoto } from '../../domain/photo';
import { useAuthentication } from '../../hooks/useAuthentication';
import { escolherDocumentoDaGaleria } from '../../services/documentoDaGaleria';
import { SettingsProvider } from '../../storage/SettingsProvider';
import { HomeScreen } from '../HomeScreen';

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('../../hooks/useAuthentication', () => ({ useAuthentication: jest.fn() }));
jest.mock('../../services/documentoDaGaleria', () => ({ escolherDocumentoDaGaleria: jest.fn() }));

const sair = jest.fn();
const onDigitalizarDocumento = jest.fn();
const onUsarFotoDaGaleria = jest.fn();

async function abrir() {
  await render(
    <HomeScreen
      onDigitalizarDocumento={onDigitalizarDocumento}
      onUsarFotoDaGaleria={onUsarFotoDaGaleria}
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
    onDigitalizarDocumento.mockReset();
    onUsarFotoDaGaleria.mockReset();
    jest.mocked(useAuthentication).mockReturnValue({ sair } as unknown as ReturnType<typeof useAuthentication>);
  });

  test('o botão Sair da conta encerra a sessão', async () => {
    await abrir();

    await fireEvent.press(await screen.findByText('Sair da conta'));

    expect(sair).toHaveBeenCalledTimes(1);
  });

  test('Digitalizar documento pergunta a origem da foto antes de abrir a câmera', async () => {
    await abrir();

    await fireEvent.press(await screen.findByText('Digitalizar documento'));

    expect(onDigitalizarDocumento).not.toHaveBeenCalled();
    await fireEvent.press(await screen.findByText('Tirar foto agora'));
    expect(onDigitalizarDocumento).toHaveBeenCalledTimes(1);
  });

  test('a foto escolhida na galeria segue para posicionar a assinatura', async () => {
    const foto = createCapturedPhoto('file:///cache/manipulada.jpg', 3024, 4032);
    jest.mocked(escolherDocumentoDaGaleria).mockResolvedValue({ tipo: 'escolhida', foto });
    await abrir();

    await fireEvent.press(await screen.findByText('Digitalizar documento'));
    await fireEvent.press(await screen.findByText('Escolher da galeria'));

    await waitFor(() => expect(onUsarFotoDaGaleria).toHaveBeenCalledWith(foto));
    expect(onDigitalizarDocumento).not.toHaveBeenCalled();
  });

  test('não existe mais um Sair que só bloqueia', async () => {
    await abrir();

    await screen.findByText('Sair da conta');

    expect(screen.queryByText('Sair')).toBeNull();
  });
});
