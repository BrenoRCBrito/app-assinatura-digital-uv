import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import Toast from 'react-native-toast-message';

import {
  alterarSenhaNoFirebase,
  ehCredencialInvalida,
  mensagemDoErroDeAutenticacao,
} from '../../services/autenticacaoFirebase';
import { SettingsProvider } from '../../storage/SettingsProvider';
import { SenhaDialog } from '../ProfileScreen/SenhaDialog';

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('../../services/autenticacaoFirebase', () => ({
  alterarSenhaNoFirebase: jest.fn(),
  ehCredencialInvalida: jest.fn(),
  mensagemDoErroDeAutenticacao: jest.fn(),
}));

async function abrir() {
  const onClose = jest.fn();
  await render(<SenhaDialog visible onClose={onClose} />, { wrapper: SettingsProvider });
  return { onClose };
}

async function preencher(atual = 'Atual@123', nova = 'Nova@12345', confirmacao = nova) {
  await fireEvent.changeText(screen.getByLabelText('Senha atual'), atual);
  await fireEvent.changeText(screen.getByLabelText('Nova senha'), nova);
  await fireEvent.changeText(screen.getByLabelText('Confirmar nova senha'), confirmacao);
}

function botaoSalvar() {
  return screen.getByRole('button', { name: /^(Salvar senha|Salvando…)$/ });
}

describe('SenhaDialog', () => {
  let alerta: jest.SpyInstance;
  let toast: jest.SpyInstance;

  beforeEach(() => {
    jest.mocked(alterarSenhaNoFirebase).mockReset();
    jest.mocked(ehCredencialInvalida).mockReturnValue(false);
    jest.mocked(mensagemDoErroDeAutenticacao).mockReturnValue(null);
    alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    toast = jest.spyOn(Toast, 'show').mockImplementation(() => undefined);
  });

  afterEach(() => {
    alerta.mockRestore();
    toast.mockRestore();
  });

  test('vazio ou com a nova senha fraca, o botão fica desativado', async () => {
    await abrir();
    expect(botaoSalvar().props.accessibilityState).toEqual({ disabled: true });

    await preencher('Atual@123', 'fraca');

    expect(botaoSalvar().props.accessibilityState).toEqual({ disabled: true });
  });

  test('com as senhas diferentes, avisa e não deixa salvar', async () => {
    await abrir();

    await preencher('Atual@123', 'Nova@12345', 'Nova@12346');

    expect(screen.getByText('As senhas ainda não são iguais.')).toBeTruthy();
    expect(botaoSalvar().props.accessibilityState).toEqual({ disabled: true });
  });

  test('salvar troca a senha no Firebase, avisa e fecha', async () => {
    jest.mocked(alterarSenhaNoFirebase).mockResolvedValue(undefined);
    const { onClose } = await abrir();
    await preencher();

    await fireEvent.press(botaoSalvar());

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(alterarSenhaNoFirebase).toHaveBeenCalledWith('Atual@123', 'Nova@12345');
    expect(toast).toHaveBeenCalledWith({ type: 'success', text1: 'Senha atualizada.' });
  });

  test('com a senha atual errada, mostra Senha incorreta e não fecha', async () => {
    jest
      .mocked(alterarSenhaNoFirebase)
      .mockRejectedValue(Object.assign(new Error('x'), { code: 'auth/invalid-credential' }));
    jest.mocked(ehCredencialInvalida).mockReturnValue(true);
    const { onClose } = await abrir();
    await preencher();

    await fireEvent.press(botaoSalvar());

    await waitFor(() =>
      expect(alerta).toHaveBeenCalledWith('Senha incorreta', 'Confira a senha atual e tente de novo.'),
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  test('erro que o Firebase explica, como falta de internet, mostra a mensagem em português', async () => {
    jest.mocked(alterarSenhaNoFirebase).mockRejectedValue(new Error('rede'));
    jest.mocked(mensagemDoErroDeAutenticacao).mockReturnValue('Sem conexão com a internet. Conecte-se para continuar.');
    const { onClose } = await abrir();
    await preencher();

    await fireEvent.press(botaoSalvar());

    await waitFor(() =>
      expect(alerta).toHaveBeenCalledWith('Erro', 'Sem conexão com a internet. Conecte-se para continuar.'),
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  test('erro inesperado mostra a mensagem genérica e fica registrado no console', async () => {
    const erro = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.mocked(alterarSenhaNoFirebase).mockRejectedValue(new Error('inesperado'));
    await abrir();
    await preencher();

    await fireEvent.press(botaoSalvar());

    await waitFor(() => expect(alerta).toHaveBeenCalledWith('Erro', 'Não foi possível atualizar a senha.'));
    expect(erro).toHaveBeenCalledTimes(1);
    erro.mockRestore();
  });
});
