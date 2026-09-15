import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import type { TestInstance } from 'test-renderer';

import { SettingsProvider } from '../../storage/SettingsProvider';
import { lightTheme, tokens } from '../../theme';
import { List } from '../List';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const MENSAGEM_VAZIA = 'Nenhuma assinatura salva.';

function descendentes(no: TestInstance): TestInstance[] {
  return no.children.flatMap((filho) => (typeof filho === 'string' ? [] : [filho, ...descendentes(filho)]));
}

function estilo(no: TestInstance | null | undefined) {
  return StyleSheet.flatten(no?.props.style);
}

function divisorias() {
  return descendentes(screen.container).filter((no) => estilo(no)?.backgroundColor === lightTheme.divider);
}

async function renderizarLista(items: readonly string[], loading: boolean, preset?: 'default' | 'grouped') {
  await render(
    <List
      items={items}
      keyOf={(item) => item}
      renderItem={(item) => <Text>{item}</Text>}
      loading={loading}
      emptyMessage={MENSAGEM_VAZIA}
      preset={preset}
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

  test('a lista padrão não envolve os itens numa superfície nem põe divisória', async () => {
    await renderizarLista(['Rubrica', 'Visto'], false);
    const item = await screen.findByText('Rubrica');

    expect(estilo(item.parent)?.backgroundColor).toBeUndefined();
    expect(divisorias()).toHaveLength(0);
  });

  test('agrupada, junta os itens numa superfície com cantos nas pontas e divisória recuada entre eles', async () => {
    await renderizarLista(['Contrato', 'Recibo', 'Termo'], false, 'grouped');
    await screen.findByText('Contrato');
    const [primeiro, meio, ultimo] = ['Contrato', 'Recibo', 'Termo'].map((texto) => screen.getByText(texto).parent);
    const divisoria = {
      height: tokens.lineWidth.hairline,
      marginLeft: tokens.inset.menuItemX + tokens.size.menuIconBox + tokens.gap.item,
      backgroundColor: lightTheme.divider,
    };

    expect(estilo(primeiro)).toEqual({
      backgroundColor: lightTheme.surface,
      borderTopLeftRadius: tokens.radius.surface,
      borderTopRightRadius: tokens.radius.surface,
    });
    expect(estilo(meio)).toEqual({ backgroundColor: lightTheme.surface });
    expect(estilo(ultimo)).toEqual({
      backgroundColor: lightTheme.surface,
      borderBottomLeftRadius: tokens.radius.surface,
      borderBottomRightRadius: tokens.radius.surface,
    });
    expect(divisorias().map(estilo)).toEqual([divisoria, divisoria]);
  });
});
