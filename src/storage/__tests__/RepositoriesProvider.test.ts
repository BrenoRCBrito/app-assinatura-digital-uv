import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook } from '@testing-library/react-native';

import { aoSolicitarSincronizacao } from '../../services/solicitacaoDeSincronizacao';
import { createRepositories } from '../createRepositories';
import { RepositoriesProvider, useRepositories } from '../RepositoriesProvider';
import { criarAssinaturaDeTeste, USUARIO_DE_TESTE } from '../testing/assinaturaRepositoryContract';
import { reiniciarBancoDeTeste } from '../testing/bancoDeTeste';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('RepositoriesProvider', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    reiniciarBancoDeTeste();
  });

  test('entrega a mesma instância em todos os renders', async () => {
    const { result, rerender } = await renderHook(() => useRepositories(), { wrapper: RepositoriesProvider });
    const primeira = result.current;

    await rerender(undefined);

    expect(result.current).toBe(primeira);
  });

  test('entrega os repositórios do SQLite', async () => {
    const { result } = await renderHook(() => useRepositories(), { wrapper: RepositoriesProvider });
    const assinatura = criarAssinaturaDeTeste('1', 'Rubrica', '2026-09-12T10:00:00.000Z');

    await result.current.assinaturas.save(assinatura);

    await expect(createRepositories('sqlite').assinaturas.list(USUARIO_DE_TESTE)).resolves.toEqual([assinatura]);
  });
});

describe('RepositoriesProvider, gatilho de sincronização', () => {
  beforeEach(() => {
    reiniciarBancoDeTeste();
  });

  test('salvar pelo repositório do app pede uma sincronização', async () => {
    const ouvinte = jest.fn();
    const parar = aoSolicitarSincronizacao(ouvinte);
    const { result } = await renderHook(() => useRepositories(), { wrapper: RepositoriesProvider });

    await result.current.assinaturas.save(criarAssinaturaDeTeste('1', 'Rubrica', '2026-09-12T10:00:00.000Z'));

    expect(ouvinte).toHaveBeenCalledTimes(1);
    parar();
  });

  test('ler não pede sincronização', async () => {
    const ouvinte = jest.fn();
    const parar = aoSolicitarSincronizacao(ouvinte);
    const { result } = await renderHook(() => useRepositories(), { wrapper: RepositoriesProvider });

    await result.current.assinaturas.list(USUARIO_DE_TESTE);

    expect(ouvinte).not.toHaveBeenCalled();
    parar();
  });
});
