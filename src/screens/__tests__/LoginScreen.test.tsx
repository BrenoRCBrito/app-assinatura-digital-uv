import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { createIsoDateTime } from '../../domain/dateTime';
import { criarCpf, criarEmail, criarNome, criarUsuarioId, type Usuario } from '../../domain/usuario';
import { useAuthentication } from '../../hooks/useAuthentication';
import { LoginScreen } from '../LoginScreen';
import { SettingsProvider } from '../../storage/SettingsProvider';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('../../hooks/useAuthentication', () => ({ useAuthentication: jest.fn() }));

const onCriarConta = jest.fn();
const onValidarDocumento = jest.fn();
const unlock = jest.fn();
const loginComSenha = jest.fn();

const USUARIO: Usuario = {
  id: criarUsuarioId('1'),
  email: criarEmail('ana@exemplo.com'),
  senhaHash: 'hash',
  nome: criarNome('Ana Souza'),
  cpf: criarCpf('11144477735'),
  telefone: null,
  foto: null,
  criadoEm: createIsoDateTime('2026-09-12T10:00:00.000Z'),
};

function mockAuth(overrides: Partial<ReturnType<typeof useAuthentication>> = {}) {
  jest.mocked(useAuthentication).mockReturnValue({
    mostrarEntrarComBiometria: false,
    usuarioBiometria: null,
    authenticating: false,
    loginComSenha,
    unlock,
    ...overrides,
  } as unknown as ReturnType<typeof useAuthentication>);
}

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth();
  });

    test('sem biometria disponível, mostra o formulário de e-mail e senha', async () => {
    await render(<LoginScreen onCriarConta={onCriarConta} onValidarDocumento={onValidarDocumento} />, {
        wrapper: SettingsProvider,
    });

    expect(await screen.findByText('E-mail')).toBeTruthy();
    expect(screen.queryByText('Acessar')).toBeNull();
    });

    test('com biometria disponível, mostra o cartão com nome e CPF mascarado', async () => {
    mockAuth({ mostrarEntrarComBiometria: true, usuarioBiometria: USUARIO });

    await render(<LoginScreen onCriarConta={onCriarConta} onValidarDocumento={onValidarDocumento} />, {
        wrapper: SettingsProvider,
    });

    expect(await screen.findByText('Ana Souza')).toBeTruthy();
    expect(screen.getByText('111.***.***-35')).toBeTruthy();
    expect(screen.queryByText('E-mail')).toBeNull();
    });

    test('tocar em Acessar aciona a biometria', async () => {
    mockAuth({ mostrarEntrarComBiometria: true, usuarioBiometria: USUARIO });
    await render(<LoginScreen onCriarConta={onCriarConta} onValidarDocumento={onValidarDocumento} />, {
        wrapper: SettingsProvider,
    });

    fireEvent.press(await screen.findByText('Acessar'));

    expect(unlock).toHaveBeenCalledTimes(1);
    });

    test('"Entrar com outra conta" troca pro formulário de senha', async () => {
    mockAuth({ mostrarEntrarComBiometria: true, usuarioBiometria: USUARIO });
    await render(<LoginScreen onCriarConta={onCriarConta} onValidarDocumento={onValidarDocumento} />, {
        wrapper: SettingsProvider,
    });

    fireEvent.press(await screen.findByText('Entrar com outra conta'));

    expect(await screen.findByText('E-mail')).toBeTruthy();
    });

    test('"Usar biometria" volta pro cartão rápido', async () => {
    mockAuth({ mostrarEntrarComBiometria: true, usuarioBiometria: USUARIO });
    await render(<LoginScreen onCriarConta={onCriarConta} onValidarDocumento={onValidarDocumento} />, {
        wrapper: SettingsProvider,
    });

    fireEvent.press(await screen.findByText('Entrar com outra conta'));
    fireEvent.press(await screen.findByText('Usar biometria'));

    expect(await screen.findByText('Ana Souza')).toBeTruthy();
    });

    test('no cartão de acesso rápido, "Validar um documento" abre a validação sem entrar', async () => {
    mockAuth({ mostrarEntrarComBiometria: true, usuarioBiometria: USUARIO });
    await render(<LoginScreen onCriarConta={onCriarConta} onValidarDocumento={onValidarDocumento} />, {
        wrapper: SettingsProvider,
    });

    fireEvent.press(await screen.findByText('Validar um documento'));

    expect(onValidarDocumento).toHaveBeenCalledTimes(1);
    expect(unlock).not.toHaveBeenCalled();
    });

});
