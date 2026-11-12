import { aoSolicitarSincronizacao, solicitarSincronizacao } from '../solicitacaoDeSincronizacao';

describe('solicitacaoDeSincronizacao', () => {
  test('quem está ouvindo é avisado a cada pedido', () => {
    const ouvinte = jest.fn();
    const parar = aoSolicitarSincronizacao(ouvinte);

    solicitarSincronizacao();
    solicitarSincronizacao();

    expect(ouvinte).toHaveBeenCalledTimes(2);
    parar();
  });

  test('depois de parar de ouvir, não é mais avisado', () => {
    const ouvinte = jest.fn();
    aoSolicitarSincronizacao(ouvinte)();

    solicitarSincronizacao();

    expect(ouvinte).not.toHaveBeenCalled();
  });

  test('todos os ouvintes são avisados', () => {
    const primeiro = jest.fn();
    const segundo = jest.fn();
    const pararPrimeiro = aoSolicitarSincronizacao(primeiro);
    const pararSegundo = aoSolicitarSincronizacao(segundo);

    solicitarSincronizacao();

    expect(primeiro).toHaveBeenCalledTimes(1);
    expect(segundo).toHaveBeenCalledTimes(1);
    pararPrimeiro();
    pararSegundo();
  });

  test('um ouvinte que para de ouvir durante o aviso não atrapalha os outros', () => {
    const segundo = jest.fn();
    let pararPrimeiro: () => void = () => undefined;
    pararPrimeiro = aoSolicitarSincronizacao(() => pararPrimeiro());
    const pararSegundo = aoSolicitarSincronizacao(segundo);

    solicitarSincronizacao();

    expect(segundo).toHaveBeenCalledTimes(1);
    pararSegundo();
  });

  test('sem ninguém ouvindo, pedir não faz nada nem dá erro', () => {
    expect(() => solicitarSincronizacao()).not.toThrow();
  });
});
