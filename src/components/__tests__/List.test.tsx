import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { SettingsProvider } from '../../storage/SettingsProvider';
import { List } from '../List';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const MENSAGEM_VAZIA = 'Nenhuma assinatura salva.';

async function renderizarLista(items: readonly string[], loading: boolean) {
  await render(
    <List
      items={items}
      keyOf={(item) => item}
      renderItem={(item) => <Text>{item}</Text>}
      loading={loading}
      emptyMessage={MENSAGEM_VAZIA}
    />,
    { wrapper: SettingsProvider },
  );
}

describe('List', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('mostra o indicador enquanto carrega sem itens', async () => {
    await renderizarLista([], true);

    expect(await screen.findByLabelText('Carregando')).toBeOnTheScreen();
    expect(screen.queryByText(MENSAGEM_VAZIA)).not.toBeOnTheScreen();
  });

  test('mostra a mensagem de vazio quando termina sem itens', async () => {
    await renderizarLista([], false);

    expect(await screen.findByText(MENSAGEM_VAZIA)).toBeOnTheScreen();
    expect(screen.queryByLabelText('Carregando')).not.toBeOnTheScreen();
  });

  test('mostra os itens', async () => {
    await renderizarLista(['Rubrica', 'Visto'], false);

    expect(await screen.findByText('Rubrica')).toBeOnTheScreen();
    expect(screen.getByText('Visto')).toBeOnTheScreen();
    expect(screen.queryByText(MENSAGEM_VAZIA)).not.toBeOnTheScreen();
  });

  test('mantém os itens na tela enquanto recarrega', async () => {
    await renderizarLista(['Rubrica'], true);

    expect(await screen.findByText('Rubrica')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Carregando')).not.toBeOnTheScreen();
  });
});
