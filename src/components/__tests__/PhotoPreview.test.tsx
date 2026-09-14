import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import type { TestInstance } from 'test-renderer';

import { createCapturedPhoto } from '../../domain/photo';
import { SettingsProvider } from '../../storage/SettingsProvider';
import { darkTheme, tokens } from '../../theme';
import { PhotoPreview } from '../PhotoPreview';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

const FOTO = createCapturedPhoto('file:///cache/foto.jpg', 3024, 4032);

function descendentes(no: TestInstance): TestInstance[] {
  return no.children.flatMap((filho) => (typeof filho === 'string' ? [] : [filho, ...descendentes(filho)]));
}

function modalDaPrevia(): TestInstance {
  const modal = descendentes(screen.container).find((no) => no.type === 'Modal');
  if (modal === undefined) {
    throw new Error('Modal da prévia não encontrado.');
  }
  return modal;
}

describe('PhotoPreview', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('sem foto, a prévia fica fechada', async () => {
    await render(<PhotoPreview foto={null} saving={false} onRetake={jest.fn()} onUse={jest.fn()} />, {
      wrapper: SettingsProvider,
    });

    await waitFor(() => expect(screen.queryByText('Carregando…')).toBeNull());
    expect(screen.queryByText('Prévia')).toBeNull();
  });

  test('mostra a foto inteira e devolve Tirar outra e Usar foto', async () => {
    const onRetake = jest.fn();
    const onUse = jest.fn();
    await render(<PhotoPreview foto={FOTO} saving={false} onRetake={onRetake} onUse={onUse} />, {
      wrapper: SettingsProvider,
    });

    await screen.findByText('Prévia');
    const imagem = screen.getByLabelText('Foto do documento');
    await fireEvent.press(screen.getByText('Tirar outra'));
    await fireEvent.press(screen.getByText('Usar foto'));

    expect([imagem.props.source, imagem.props.resizeMode]).toEqual([{ uri: 'file:///cache/foto.jpg' }, 'contain']);
    expect(onRetake).toHaveBeenCalledTimes(1);
    expect(onUse).toHaveBeenCalledTimes(1);
  });

  test('fica escura no tema claro, com Tirar outra no contorno do sistema', async () => {
    await render(<PhotoPreview foto={FOTO} saving={false} onRetake={jest.fn()} onUse={jest.fn()} />, {
      wrapper: SettingsProvider,
    });

    await screen.findByText('Prévia');
    const [tirarOutra] = screen.getAllByRole('button');

    expect(StyleSheet.flatten(screen.getByText('Prévia').props.style).color).toBe(darkTheme.textPrimary);
    expect(StyleSheet.flatten(tirarOutra.props.style)).toMatchObject({
      borderColor: darkTheme.textSecondary,
      borderWidth: tokens.lineWidth.outline,
    });
  });

  test('enquanto salva, desativa Tirar outra e Usar foto', async () => {
    await render(<PhotoPreview foto={FOTO} saving onRetake={jest.fn()} onUse={jest.fn()} />, {
      wrapper: SettingsProvider,
    });

    await screen.findByText('Prévia');

    expect(screen.getAllByRole('button').map((botao) => botao.props.accessibilityState)).toEqual([
      { disabled: true },
      { disabled: true },
    ]);
  });

  test('o voltar do Android equivale a Tirar outra', async () => {
    const onRetake = jest.fn();
    await render(<PhotoPreview foto={FOTO} saving={false} onRetake={onRetake} onUse={jest.fn()} />, {
      wrapper: SettingsProvider,
    });

    await screen.findByText('Prévia');
    await fireEvent(modalDaPrevia(), 'requestClose');

    expect(onRetake).toHaveBeenCalledTimes(1);
  });

  test('o voltar do Android não faz nada enquanto salva', async () => {
    const onRetake = jest.fn();
    await render(<PhotoPreview foto={FOTO} saving onRetake={onRetake} onUse={jest.fn()} />, {
      wrapper: SettingsProvider,
    });

    await screen.findByText('Prévia');
    await fireEvent(modalDaPrevia(), 'requestClose');

    expect(onRetake).not.toHaveBeenCalled();
  });
});
