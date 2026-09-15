import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';

import { criarTituloDocumento } from '../../domain/documento';
import { createFraction } from '../../domain/geometry';
import { createCapturedPhoto } from '../../domain/photo';
import {
  copiarFotoDocumento,
  excluirArquivosDocumento,
  guardarPdfDocumento,
  lerFotoDocumentoBase64,
} from '../../services/fileSystem';
import { authenticateDeviceOwner } from '../../services/localAuthentication';
import { obterLocalAssinatura } from '../../services/location';
import { gerarPdf, montarHtmlDocumento } from '../../services/print';
import { RepositoriesProvider, useRepositories } from '../../storage/RepositoriesProvider';
import { criarAssinaturaDeTeste } from '../../storage/testing/assinaturaRepositoryContract';
import { assinarDocumento, type PedidoAssinatura, type ResultadoAssinatura } from '../../useCases/assinarDocumento';
import { useAssinarDocumento } from '../useAssinarDocumento';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../../useCases/assinarDocumento', () => ({ assinarDocumento: jest.fn() }));

const PEDIDO: PedidoAssinatura = {
  titulo: criarTituloDocumento('Contrato de locação'),
  assinatura: criarAssinaturaDeTeste('1', 'Rubrica', '2026-09-12T10:00:00.000Z'),
  foto: createCapturedPhoto('file:///cache/foto.jpg', 3024, 4032),
  selo: { x: createFraction(0.4), y: createFraction(0.65), largura: createFraction(0.35) },
};

function useAssinarComRepositorios() {
  return { assinatura: useAssinarDocumento(), repositorios: useRepositories() };
}

describe('useAssinarDocumento', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.mocked(assinarDocumento).mockReset();
  });

  test('liga o caso de uso aos services reais e ao repositório de documentos', async () => {
    jest.mocked(assinarDocumento).mockResolvedValue({ tipo: 'cancelado' });
    const { result } = await renderHook(useAssinarComRepositorios, { wrapper: RepositoriesProvider });

    await act(async () => {
      await result.current.assinatura.assinar(PEDIDO);
    });

    const [dependencias, pedido] = jest.mocked(assinarDocumento).mock.calls[0];
    expect(pedido).toBe(PEDIDO);
    expect(dependencias).toMatchObject({
      authenticateDeviceOwner,
      obterLocalAssinatura,
      copiarFotoDocumento,
      lerFotoDocumentoBase64,
      guardarPdfDocumento,
      excluirArquivosDocumento,
      montarHtmlDocumento,
      gerarPdf,
      documentos: result.current.repositorios.documentos,
    });
    expect(dependencias.criarDocumentoId()).toMatch(/^\d+$/);
    const agora = dependencias.agora();
    expect(new Date(agora).toISOString()).toBe(agora);
  });

  test('fica assinando enquanto o caso de uso roda e ignora o segundo toque', async () => {
    let terminar: (resultado: ResultadoAssinatura) => void = () => undefined;
    jest.mocked(assinarDocumento).mockReturnValue(
      new Promise((resolve) => {
        terminar = resolve;
      }),
    );
    const { result } = await renderHook(useAssinarDocumento, { wrapper: RepositoriesProvider });

    let primeiro: Promise<ResultadoAssinatura | null> = Promise.resolve(null);
    let segundo: ResultadoAssinatura | null = { tipo: 'cancelado' };
    await act(async () => {
      primeiro = result.current.assinar(PEDIDO);
      segundo = await result.current.assinar(PEDIDO);
    });

    expect(segundo).toBeNull();
    expect(result.current.assinando).toBe(true);
    expect(assinarDocumento).toHaveBeenCalledTimes(1);

    await act(async () => {
      terminar({ tipo: 'cancelado' });
      await primeiro;
    });

    expect(result.current.assinando).toBe(false);
  });
});
