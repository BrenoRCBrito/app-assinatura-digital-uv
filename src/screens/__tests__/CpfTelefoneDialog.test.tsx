import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import Toast from 'react-native-toast-message';

import { createIsoDateTime } from '../../domain/dateTime';
import { criarCpf, criarEmail, criarNome, criarTelefone, criarUsuarioId, type Usuario } from '../../domain/usuario';
import { SettingsProvider } from '../../storage/SettingsProvider';
import { CpfDialog } from '../ProfileScreen/CpfDialog';
import { TelefoneDialog } from '../ProfileScreen/TelefoneDialog';

const mockUpdateCpf = jest.fn();
const mockUpdateTelefone = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('../../storage/RepositoriesProvider', () => ({
  useRepositories: () => ({ usuarios: { updateCpf: mockUpdateCpf, updateTelefone: mockUpdateTelefone } }),
}));

const USUARIO: Usuario = {
  id: criarUsuarioId('1'),
  email: criarEmail('ana@exemplo.com'),
  nome: criarNome('Ana Souza'),
  cpf: null,
  telefone: null,
  foto: null,
  criadoEm: createIsoDateTime('2026-09-12T10:00:00.000Z'),
};

describe('máscara de CPF e telefone no perfil', () => {
  let toast: jest.SpyInstance;

  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    toast = jest.spyOn(Toast, 'show').mockImplementation(() => undefined);
  });

  afterEach(() => {
    toast.mockRestore();
  });

  test('o CPF salvo abre já mascarado', async () => {
    const usuario = { ...USUARIO, cpf: criarCpf('11144477735') };
    await render(<CpfDialog visible usuario={usuario} onClose={jest.fn()} onSaved={jest.fn()} />, {
      wrapper: SettingsProvider,
    });

    expect((await screen.findByLabelText('CPF')).props.value).toBe('111.444.777-35');
  });

  test('o CPF ganha a máscara ao digitar e é salvo só com os números', async () => {
    mockUpdateCpf.mockResolvedValue({ ...USUARIO, cpf: criarCpf('11144477735') });
    await render(<CpfDialog visible usuario={USUARIO} onClose={jest.fn()} onSaved={jest.fn()} />, {
      wrapper: SettingsProvider,
    });

    await fireEvent.changeText(await screen.findByLabelText('CPF'), '1114');
    expect(screen.getByLabelText('CPF').props.value).toBe('111.4');

    await fireEvent.changeText(screen.getByLabelText('CPF'), '11144477735');
    expect(screen.getByLabelText('CPF').props.value).toBe('111.444.777-35');

    await fireEvent.press(screen.getByText('Salvar CPF'));
    await waitFor(() => expect(mockUpdateCpf).toHaveBeenCalledWith(USUARIO.id, '11144477735'));
  });

  test('o telefone salvo abre já mascarado', async () => {
    const usuario = { ...USUARIO, telefone: criarTelefone('11987654321') };
    await render(<TelefoneDialog visible usuario={usuario} onClose={jest.fn()} onSaved={jest.fn()} />, {
      wrapper: SettingsProvider,
    });

    expect((await screen.findByLabelText('Telefone')).props.value).toBe('(11) 98765-4321');
  });

  test('o telefone ganha a máscara ao digitar e é salvo só com os números', async () => {
    mockUpdateTelefone.mockResolvedValue({ ...USUARIO, telefone: criarTelefone('2433334444') });
    await render(<TelefoneDialog visible usuario={USUARIO} onClose={jest.fn()} onSaved={jest.fn()} />, {
      wrapper: SettingsProvider,
    });

    await fireEvent.changeText(await screen.findByLabelText('Telefone'), '243');
    expect(screen.getByLabelText('Telefone').props.value).toBe('(24) 3');

    await fireEvent.changeText(screen.getByLabelText('Telefone'), '2433334444');
    expect(screen.getByLabelText('Telefone').props.value).toBe('(24) 3333-4444');

    await fireEvent.press(screen.getByText('Salvar telefone'));
    await waitFor(() => expect(mockUpdateTelefone).toHaveBeenCalledWith(USUARIO.id, '2433334444'));
  });
});
