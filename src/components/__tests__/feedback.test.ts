import { Alert } from 'react-native';
import Toast from 'react-native-toast-message';

import { confirm, confirmDestructive, showError, showInfo, showSuccess } from '../feedback';

describe('feedback', () => {
  let alerta: jest.SpyInstance;
  let toast: jest.SpyInstance;

  beforeEach(() => {
    alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    toast = jest.spyOn(Toast, 'show').mockImplementation(() => undefined);
  });

  afterEach(() => {
    alerta.mockRestore();
    toast.mockRestore();
  });

  test('showError abre um alerta com o título e a mensagem', () => {
    showError('Erro', 'Não foi possível salvar a assinatura.');

    expect(alerta).toHaveBeenCalledWith('Erro', 'Não foi possível salvar a assinatura.');
    expect(toast).not.toHaveBeenCalled();
  });

  test('showSuccess mostra um toast de sucesso', () => {
    showSuccess('Assinatura salva');

    expect(toast).toHaveBeenCalledWith({ type: 'success', text1: 'Assinatura salva' });
    expect(alerta).not.toHaveBeenCalled();
  });

  test('showInfo mostra um toast informativo', () => {
    showInfo('Cópia não salva na galeria');

    expect(toast).toHaveBeenCalledWith({ type: 'info', text1: 'Cópia não salva na galeria' });
    expect(alerta).not.toHaveBeenCalled();
  });

  test('confirm oferece Cancelar e só chama onConfirm pelo botão da ação', () => {
    const onConfirm = jest.fn();

    confirm({ title: 'Girar o papel', message: 'Girar apaga o desenho atual.', confirmLabel: 'Girar', onConfirm });

    const [titulo, mensagem, botoes] = alerta.mock.calls[0];
    expect([titulo, mensagem]).toEqual(['Girar o papel', 'Girar apaga o desenho atual.']);
    expect(botoes).toEqual([
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Girar', onPress: expect.any(Function) },
    ]);
    expect(onConfirm).not.toHaveBeenCalled();
    botoes[1].onPress();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test('confirmDestructive marca a ação como destrutiva', () => {
    const onConfirm = jest.fn();
    const mensagemEsperada = 'Excluir "Rubrica"? Documentos já assinados não mudam.';

    confirmDestructive({ title: 'Excluir assinatura', message: mensagemEsperada, confirmLabel: 'Excluir', onConfirm });

    const [titulo, mensagem, botoes] = alerta.mock.calls[0];
    expect([titulo, mensagem]).toEqual(['Excluir assinatura', mensagemEsperada]);
    expect(botoes).toEqual([
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: expect.any(Function) },
    ]);
    botoes[1].onPress();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
