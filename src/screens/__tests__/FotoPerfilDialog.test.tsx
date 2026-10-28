import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import Toast from 'react-native-toast-message';

import { createIsoDateTime } from '../../domain/dateTime';
import { criarEmail, criarNome, criarUsuarioId, type Usuario } from '../../domain/usuario';
import { escolherFotoDaGaleria, tirarFotoDePerfil } from '../../services/fotoPerfil';
import { SettingsProvider } from '../../storage/SettingsProvider';
import { FotoPerfilDialog } from '../ProfileScreen/FotoPerfilDialog';

const mockUpdateFoto = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('../../services/fotoPerfil', () => ({ escolherFotoDaGaleria: jest.fn(), tirarFotoDePerfil: jest.fn() }));
jest.mock('../../storage/RepositoriesProvider', () => ({
  useRepositories: () => ({ usuarios: { updateFoto: mockUpdateFoto } }),
}));

const USUARIO: Usuario = {
  id: criarUsuarioId('1'),
  email: criarEmail('ana@exemplo.com'),
  senhaHash: 'hash',
  nome: criarNome('Ana Souza'),
  cpf: null,
  telefone: null,
  foto: null,
  criadoEm: createIsoDateTime('2026-09-12T10:00:00.000Z'),
};
const ATUALIZADO = { ...USUARIO, foto: 'Zm90bw==' } as unknown as Usuario;

async function abrir(usuario: Usuario = USUARIO) {
  const onClose = jest.fn();
  const onSaved = jest.fn();
  await render(<FotoPerfilDialog visible usuario={usuario} onClose={onClose} onSaved={onSaved} />, {
    wrapper: SettingsProvider,
  });
  return { onClose, onSaved };
}

describe('FotoPerfilDialog', () => {
  let alerta: jest.SpyInstance;
  let toast: jest.SpyInstance;

  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    toast = jest.spyOn(Toast, 'show').mockImplementation(() => undefined);
  });

  afterEach(() => {
    alerta.mockRestore();
    toast.mockRestore();
  });

  test('Tirar foto agora salva a foto da câmera e fecha o diálogo', async () => {
    jest.mocked(tirarFotoDePerfil).mockResolvedValue({ tipo: 'escolhida', foto: 'Zm90bw==' as never });
    mockUpdateFoto.mockResolvedValue(ATUALIZADO);
    const { onClose, onSaved } = await abrir();

    await fireEvent.press(await screen.findByText('Tirar foto agora'));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(mockUpdateFoto).toHaveBeenCalledWith(USUARIO.id, 'Zm90bw==');
    expect(onSaved).toHaveBeenCalledWith(ATUALIZADO);
    expect(toast).toHaveBeenCalledWith({ type: 'success', text1: 'Foto de perfil atualizada.' });
    expect(escolherFotoDaGaleria).not.toHaveBeenCalled();
  });

  test('Escolher da galeria salva a foto escolhida', async () => {
    jest.mocked(escolherFotoDaGaleria).mockResolvedValue({ tipo: 'escolhida', foto: 'Zm90bw==' as never });
    mockUpdateFoto.mockResolvedValue(ATUALIZADO);
    const { onSaved } = await abrir();

    await fireEvent.press(await screen.findByText('Escolher da galeria'));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(ATUALIZADO));
    expect(mockUpdateFoto).toHaveBeenCalledWith(USUARIO.id, 'Zm90bw==');
    expect(tirarFotoDePerfil).not.toHaveBeenCalled();
  });

  test('cancelar a câmera não salva nada e deixa o diálogo aberto', async () => {
    jest.mocked(tirarFotoDePerfil).mockResolvedValue({ tipo: 'cancelada' });
    const { onClose } = await abrir();

    await fireEvent.press(await screen.findByText('Tirar foto agora'));

    await waitFor(() => expect(tirarFotoDePerfil).toHaveBeenCalledTimes(1));
    expect(mockUpdateFoto).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  test('sem permissão da câmera que ainda dá para pedir, só avisa', async () => {
    jest.mocked(tirarFotoDePerfil).mockResolvedValue({ tipo: 'semPermissao', podePedirDeNovo: true });
    await abrir();

    await fireEvent.press(await screen.findByText('Tirar foto agora'));

    await waitFor(() => expect(alerta).toHaveBeenCalledWith('Erro', 'Permita o acesso à câmera para tirar a foto.'));
    expect(mockUpdateFoto).not.toHaveBeenCalled();
  });

  test('com a permissão bloqueada, o aviso oferece abrir as configurações', async () => {
    jest.mocked(escolherFotoDaGaleria).mockResolvedValue({ tipo: 'semPermissao', podePedirDeNovo: false });
    await abrir();

    await fireEvent.press(await screen.findByText('Escolher da galeria'));

    await waitFor(() =>
      expect(alerta).toHaveBeenCalledWith(
        'Erro',
        'Permita o acesso às fotos para escolher a imagem.',
        expect.arrayContaining([expect.objectContaining({ text: 'Abrir configurações' })]),
      ),
    );
  });

  test('falha ao salvar mostra o erro e não fecha', async () => {
    const erro = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.mocked(tirarFotoDePerfil).mockResolvedValue({ tipo: 'escolhida', foto: 'Zm90bw==' as never });
    mockUpdateFoto.mockRejectedValue(new Error('Sem banco'));
    const { onClose } = await abrir();

    await fireEvent.press(await screen.findByText('Tirar foto agora'));

    await waitFor(() => expect(alerta).toHaveBeenCalledWith('Erro', 'Não foi possível atualizar a foto de perfil.'));
    expect(onClose).not.toHaveBeenCalled();
    expect(erro).toHaveBeenCalledTimes(1);
    erro.mockRestore();
  });

  test('Remover foto só aparece quando já existe foto, e remove', async () => {
    mockUpdateFoto.mockResolvedValue(USUARIO);
    await abrir();
    expect(screen.queryByText('Remover foto')).toBeNull();
  });

  test('com foto, Remover foto apaga a foto do usuário', async () => {
    mockUpdateFoto.mockResolvedValue(USUARIO);
    const { onSaved } = await abrir(ATUALIZADO);

    await fireEvent.press(await screen.findByText('Remover foto'));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(USUARIO));
    expect(mockUpdateFoto).toHaveBeenCalledWith(USUARIO.id, null);
  });
});
