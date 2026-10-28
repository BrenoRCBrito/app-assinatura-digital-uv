import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen } from '@testing-library/react-native';

import { SettingsProvider } from '../../storage/SettingsProvider';
import { CartaoDeAcessoRapido } from '../CartaoDeAcessoRapido';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('CartaoDeAcessoRapido', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('mostra a foto, o nome e o subtítulo', async () => {
    await render(<CartaoDeAcessoRapido fotoBase64="Zm90bw==" titulo="Ana Souza" subtitulo="111.***.***-35" />, {
      wrapper: SettingsProvider,
    });

    expect((await screen.findByLabelText('Foto de perfil')).props.source).toEqual({
      uri: 'data:image/jpeg;base64,Zm90bw==',
    });
    expect(screen.getByText('Ana Souza')).toBeTruthy();
    expect(screen.getByText('111.***.***-35')).toBeTruthy();
  });

  test('sem foto, mostra o ícone no lugar e sem subtítulo some a segunda linha', async () => {
    await render(<CartaoDeAcessoRapido fotoBase64={null} titulo="ana@exemplo.com" subtitulo={null} />, {
      wrapper: SettingsProvider,
    });

    expect(await screen.findByText('ana@exemplo.com')).toBeTruthy();
    expect(screen.queryByLabelText('Foto de perfil')).toBeNull();
  });
});
