import { addNetworkStateListener } from 'expo-network';

import { observarVoltaDaInternet } from '../rede';

jest.mock('expo-network', () => ({ addNetworkStateListener: jest.fn() }));

type Estado = Readonly<{ isConnected?: boolean; isInternetReachable?: boolean }>;

const COM_INTERNET: Estado = { isConnected: true, isInternetReachable: true };
const SEM_CONEXAO: Estado = { isConnected: false, isInternetReachable: false };

function observar() {
  const remover = jest.fn();
  let emitir: (estado: Estado) => void = () => undefined;
  jest.mocked(addNetworkStateListener).mockImplementation(((ouvinte: (estado: Estado) => void) => {
    emitir = ouvinte;
    return { remove: remover };
  }) as never);
  const aoVoltar = jest.fn();
  const parar = observarVoltaDaInternet(aoVoltar);
  return { aoVoltar, parar, remover, emitir: (estado: Estado) => emitir(estado) };
}

describe('observarVoltaDaInternet', () => {
  beforeEach(() => {
    jest.mocked(addNetworkStateListener).mockReset();
  });

  test('avisa quando a internet volta depois de ter caído', () => {
    const { aoVoltar, emitir } = observar();

    emitir(COM_INTERNET);
    emitir(SEM_CONEXAO);
    emitir(COM_INTERNET);

    expect(aoVoltar).toHaveBeenCalledTimes(1);
  });

  test('o primeiro estado é só o ponto de partida: com internet desde o começo, não avisa', () => {
    const { aoVoltar, emitir } = observar();

    emitir(COM_INTERNET);

    expect(aoVoltar).not.toHaveBeenCalled();
  });

  test('começando sem internet, avisa quando ela chega', () => {
    const { aoVoltar, emitir } = observar();

    emitir(SEM_CONEXAO);
    emitir(COM_INTERNET);

    expect(aoVoltar).toHaveBeenCalledTimes(1);
  });

  test('trocar de rede sem cair (wi-fi para dados) não conta como voltar', () => {
    const { aoVoltar, emitir } = observar();

    emitir(COM_INTERNET);
    emitir({ isConnected: true, isInternetReachable: true });

    expect(aoVoltar).not.toHaveBeenCalled();
  });

  test('conectado, mas o Android diz que a internet não chega: continua sem internet', () => {
    const { aoVoltar, emitir } = observar();

    emitir(SEM_CONEXAO);
    emitir({ isConnected: true, isInternetReachable: false });

    expect(aoVoltar).not.toHaveBeenCalled();
  });

  test('conectado sem informação de alcance (iOS) conta como internet', () => {
    const { aoVoltar, emitir } = observar();

    emitir(SEM_CONEXAO);
    emitir({ isConnected: true });

    expect(aoVoltar).toHaveBeenCalledTimes(1);
  });

  test('cada queda seguida de volta avisa uma vez', () => {
    const { aoVoltar, emitir } = observar();

    emitir(COM_INTERNET);
    emitir(SEM_CONEXAO);
    emitir(COM_INTERNET);
    emitir(SEM_CONEXAO);
    emitir(COM_INTERNET);

    expect(aoVoltar).toHaveBeenCalledTimes(2);
  });

  test('parar de observar remove a assinatura do sistema', () => {
    const { parar, remover } = observar();

    parar();

    expect(remover).toHaveBeenCalledTimes(1);
  });

  test('se o módulo de rede não existe no app instalado, não quebra e devolve um parar que não faz nada', () => {
    const aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.mocked(addNetworkStateListener).mockImplementation(() => {
      throw new Error("Cannot find native module 'ExpoNetwork'");
    });

    const parar = observarVoltaDaInternet(jest.fn());

    expect(() => parar()).not.toThrow();
    expect(aviso).toHaveBeenCalledTimes(1);
    aviso.mockRestore();
  });
});
