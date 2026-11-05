import { openDatabaseSync } from 'expo-sqlite';

import { abrirBanco, NOME_DO_BANCO } from '../sqlite/banco';
import { createSqliteAssinaturaRepository } from '../sqlite/sqliteAssinaturaRepository';
import {
  criarAssinaturaDeTeste,
  testarContratoAssinaturaRepository,
  USUARIO_DE_TESTE,
} from '../testing/assinaturaRepositoryContract';
import { corromperAssinaturaNoBanco, reiniciarBancoDeTeste } from '../testing/bancoDeTeste';

jest.mock('expo-sqlite');
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

function criarRepositorio() {
  return createSqliteAssinaturaRepository(abrirBanco());
}

function linhasSalvas() {
  return openDatabaseSync(NOME_DO_BANCO).getAllAsync<Record<string, unknown>>('SELECT * FROM assinaturas');
}

testarContratoAssinaturaRepository('SQLite', criarRepositorio, {
  antesDeCada: async () => {
    reiniciarBancoDeTeste();
  },
  corromperDados: () => corromperAssinaturaNoBanco(),
});

describe('AssinaturaRepository (SQLite), colunas de sincronização', () => {
  beforeEach(() => {
    reiniciarBancoDeTeste();
  });

  test('save grava as datas e marca a linha como pendente de sincronização', async () => {
    await criarRepositorio().save(criarAssinaturaDeTeste('1', 'Rubrica', '2026-09-12T10:00:00.000Z'));

    const [linha] = await linhasSalvas();

    expect(linha).toMatchObject({
      id: '1',
      created_at: '2026-09-12T10:00:00.000Z',
      deleted_at: null,
      sync_status: 'pending',
    });
    expect(Number.isNaN(Date.parse(String(linha.updated_at)))).toBe(false);
  });

  test('delete não apaga a linha: marca deleted_at e deixa pendente, e a lista esconde', async () => {
    const repositorio = criarRepositorio();
    await repositorio.save(criarAssinaturaDeTeste('1', 'Rubrica', '2026-09-12T10:00:00.000Z'));

    await repositorio.delete(criarAssinaturaDeTeste('1', 'Rubrica', '2026-09-12T10:00:00.000Z').id);

    const linhas = await linhasSalvas();
    expect(linhas).toHaveLength(1);
    expect(linhas[0].deleted_at).not.toBeNull();
    expect(linhas[0].sync_status).toBe('pending');
    await expect(repositorio.list(USUARIO_DE_TESTE)).resolves.toEqual([]);
  });

  test('salvar de novo uma assinatura apagada traz ela de volta', async () => {
    const repositorio = criarRepositorio();
    const assinatura = criarAssinaturaDeTeste('1', 'Rubrica', '2026-09-12T10:00:00.000Z');
    await repositorio.save(assinatura);
    await repositorio.delete(assinatura.id);

    await repositorio.save(assinatura);

    await expect(repositorio.list(USUARIO_DE_TESTE)).resolves.toEqual([assinatura]);
    expect((await linhasSalvas())[0].deleted_at).toBeNull();
  });

  test('repositórios abertos em momentos diferentes veem os mesmos dados', async () => {
    const assinatura = criarAssinaturaDeTeste('1', 'Rubrica', '2026-09-12T10:00:00.000Z');

    await criarRepositorio().save(assinatura);

    await expect(criarRepositorio().list(USUARIO_DE_TESTE)).resolves.toEqual([assinatura]);
  });
});
