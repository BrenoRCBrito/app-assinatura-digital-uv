import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import Toast from 'react-native-toast-message';

import { useAuthentication, type ResultadoLoginComSenha } from '../../hooks/useAuthentication';
import { SettingsProvider } from '../../storage/SettingsProvider';
import { CriarContaScreen } from '../CriarContaScreen';

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('../../hooks/useAuthentication', () => ({ useAuthentication: jest.fn() }));

const cadastrar = jest.fn();

async function abrir() {
  const onJaTenhoConta = jest.fn();
  await render(<CriarContaScreen onJaTenhoConta={onJaTenhoConta} />, { wrapper: SettingsProvider });
  return { onJaTenhoConta };
}

async function preencher(senha = 'Senha@123', confirmacao = senha) {
  await fireEvent.changeText(screen.getByLabelText('Nome'), 'Ana Souza');
  await fireEvent.changeText(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
  await fireEvent.changeText(screen.getByLabelText('CPF'), '111.444.777-35');
  await fireEvent.changeText(screen.getByLabelText('Telefone'), '(11) 98765-4321');
  await fireEvent.changeText(screen.getByLabelText('Senha'), senha);
  await fireEvent.changeText(screen.getByLabelText('Confirmar senha'), confirmacao);
}

function botaoCriar() {
  return screen.getByRole('button', { name: /^(Criar conta|Criando…)$/ });
}

describe('CriarContaScreen', () => {
  let toast: jest.SpyInstance;

  beforeEach(() => {
    cadastrar.mockReset();
    jest.mocked(useAuthentication).mockReturnValue({ cadastrar } as unknown as ReturnType<typeof useAuthentication>);
    toast = jest.spyOn(Toast, 'show').mockImplementation(() => undefined);
  });

  afterEach(() => {
    toast.mockRestore();
  });

  test('com os campos vazios, o botão Criar conta fica desativado', async () => {
    await abrir();

    expect(botaoCriar().props.accessibilityState).toEqual({ disabled: true });
  });

  test('com senhas diferentes, avisa e não deixa criar', async () => {
    await abrir();

    await preencher('Senha@123', 'Senha@124');

    expect(screen.getByText('As senhas ainda não são iguais.')).toBeTruthy();
    expect(botaoCriar().props.accessibilityState).toEqual({ disabled: true });
  });

  test('com tudo preenchido, manda os dados para criar a conta e avisa que deu certo', async () => {
    cadastrar.mockResolvedValue({ ok: true } satisfies ResultadoLoginComSenha);
    await abrir();
    await preencher();

    await fireEvent.press(botaoCriar());

    await waitFor(() => expect(toast).toHaveBeenCalledWith({ type: 'success', text1: 'Conta criada!' }));
    expect(cadastrar).toHaveBeenCalledWith({
      email: 'ana@exemplo.com',
      senha: 'Senha@123',
      nome: 'Ana Souza',
      cpf: '111.444.777-35',
      telefone: '(11) 98765-4321',
    });
  });

  test('quando a criação falha, mostra a mensagem na tela e não avisa sucesso', async () => {
    cadastrar.mockResolvedValue({ ok: false, mensagem: 'Este e-mail já tem uma conta.' } satisfies ResultadoLoginComSenha);
    await abrir();
    await preencher();

    await fireEvent.press(botaoCriar());

    expect(await screen.findByText('Este e-mail já tem uma conta.')).toBeTruthy();
    expect(toast).not.toHaveBeenCalled();
  });

  test('enquanto cria, o botão mostra Criando… e fica desativado', async () => {
    let concluir: (resultado: ResultadoLoginComSenha) => void = () => undefined;
    cadastrar.mockImplementation(
      () =>
        new Promise((resolver) => {
          concluir = resolver;
        }),
    );
    await abrir();
    await preencher();

    void fireEvent.press(botaoCriar());

    expect(await screen.findByText('Criando…')).toBeTruthy();
    expect(botaoCriar().props.accessibilityState).toEqual({ disabled: true });
    expect(cadastrar).toHaveBeenCalledTimes(1);
    concluir({ ok: true });
    await waitFor(() => expect(toast).toHaveBeenCalled());
  });

  test('Já tenho conta volta para o login', async () => {
    const { onJaTenhoConta } = await abrir();

    await fireEvent.press(screen.getByText('Já tenho conta'));

    expect(onJaTenhoConta).toHaveBeenCalledTimes(1);
  });
});
