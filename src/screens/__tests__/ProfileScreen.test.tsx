import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { createIsoDateTime } from '../../domain/dateTime';
import { criarEmail, criarUsuarioId, type Usuario } from '../../domain/usuario';
import { useAuthentication } from '../../hooks/useAuthentication';
import { useRepositories } from '../../storage/RepositoriesProvider';
import { SettingsProvider } from '../../storage/SettingsProvider';
import { ProfileScreen } from '../ProfileScreen';

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('../../hooks/useAuthentication', () => ({ useAuthentication: jest.fn() }));
jest.mock('../../storage/RepositoriesProvider', () => ({ useRepositories: jest.fn() }));
jest.mock('../../services/autenticacaoFirebase', () => ({
  alterarSenhaNoFirebase: jest.fn(),
  ehCredencialInvalida: jest.fn(),
  mensagemDoErroDeAutenticacao: jest.fn(),
}));

const USUARIO: Usuario = {
  id: criarUsuarioId('uid-ana'),
  email: criarEmail('ana@exemplo.com'),
  nome: null,
  cpf: null,
  telefone: null,
  foto: null,
  criadoEm: createIsoDateTime('2026-09-12T10:00:00.000Z'),
};

async function abrir() {
  jest.mocked(useAuthentication).mockReturnValue({ usuarioId: USUARIO.id } as ReturnType<typeof useAuthentication>);
  jest.mocked(useRepositories).mockReturnValue({
    usuarios: { findById: jest.fn().mockResolvedValue(USUARIO) },
  } as unknown as ReturnType<typeof useRepositories>);
  await render(<ProfileScreen />, { wrapper: SettingsProvider });
  await screen.findByText('ana@exemplo.com');
}

describe('ProfileScreen', () => {
  test('mostra o e-mail da conta, mas sem botão de editar, porque ele identifica a conta no Firebase', async () => {
    await abrir();

    expect(screen.getByText('E-mail')).toBeTruthy();
    expect(screen.queryByLabelText('Editar e-mail')).toBeNull();
  });

  test('os outros dados continuam editáveis', async () => {
    await abrir();

    for (const rotulo of ['Editar nome', 'Editar senha', 'Editar cpf', 'Editar telefone']) {
      expect(screen.getByLabelText(rotulo)).toBeTruthy();
    }
  });

  test('Editar senha abre o diálogo de troca de senha', async () => {
    await abrir();

    await fireEvent.press(screen.getByLabelText('Editar senha'));

    expect(await screen.findByText('Editar senha')).toBeTruthy();
    expect(screen.getByLabelText('Nova senha')).toBeTruthy();
  });
});
