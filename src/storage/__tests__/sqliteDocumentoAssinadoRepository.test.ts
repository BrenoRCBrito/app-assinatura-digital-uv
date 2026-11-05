import { openDatabaseSync } from 'expo-sqlite';

import type { CodigoDeAutenticidade } from '../../domain/codigoDeAutenticidade';
import { criarDocumentoId } from '../../domain/documento';
import { abrirBanco, NOME_DO_BANCO } from '../sqlite/banco';
import { createSqliteDocumentoAssinadoRepository } from '../sqlite/sqliteDocumentoAssinadoRepository';
import { corromperDocumentoNoBanco, reiniciarBancoDeTeste } from '../testing/bancoDeTeste';
import {
  criarDocumentoDeTeste,
  testarContratoDocumentoAssinadoRepository,
  USUARIO_DE_TESTE,
} from '../testing/documentoAssinadoRepositoryContract';

jest.mock('expo-sqlite');
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

function criarRepositorio() {
  return createSqliteDocumentoAssinadoRepository(abrirBanco());
}

function linhasSalvas() {
  return openDatabaseSync(NOME_DO_BANCO).getAllAsync<Record<string, unknown>>('SELECT * FROM documentos');
}

testarContratoDocumentoAssinadoRepository('SQLite', criarRepositorio, {
  antesDeCada: async () => {
    reiniciarBancoDeTeste();
  },
  corromperDados: () => corromperDocumentoNoBanco(),
});

describe('DocumentoAssinadoRepository (SQLite), colunas de sincronização', () => {
  const DOCUMENTO = criarDocumentoDeTeste('1', 'Contrato de locação', '2026-09-12T14:32:00.000Z');

  beforeEach(() => {
    reiniciarBancoDeTeste();
    jest.useFakeTimers({ now: new Date('2026-10-01T10:00:00.000Z') });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('save grava created_at e updated_at com a hora atual e marca como pendente', async () => {
    await criarRepositorio().save(DOCUMENTO);

    expect((await linhasSalvas())[0]).toMatchObject({
      id: '1',
      assinado_em: '2026-09-12T14:32:00.000Z',
      created_at: '2026-10-01T10:00:00.000Z',
      updated_at: '2026-10-01T10:00:00.000Z',
      deleted_at: null,
      sync_status: 'pending',
    });
  });

  test('salvar de novo mantém created_at e atualiza updated_at', async () => {
    const repositorio = criarRepositorio();
    await repositorio.save(DOCUMENTO);
    jest.setSystemTime(new Date('2026-10-02T08:00:00.000Z'));

    await repositorio.save(criarDocumentoDeTeste('1', 'Contrato renomeado', '2026-09-12T14:32:00.000Z'));

    const linhas = await linhasSalvas();
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({
      titulo: 'Contrato renomeado',
      created_at: '2026-10-01T10:00:00.000Z',
      updated_at: '2026-10-02T08:00:00.000Z',
    });
  });

  test('delete marca deleted_at e deixa pendente, e findById e list escondem o documento', async () => {
    const repositorio = criarRepositorio();
    await repositorio.save(DOCUMENTO);
    jest.setSystemTime(new Date('2026-10-03T09:00:00.000Z'));

    await repositorio.delete(DOCUMENTO.id);

    const linhas = await linhasSalvas();
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({
      deleted_at: '2026-10-03T09:00:00.000Z',
      updated_at: '2026-10-03T09:00:00.000Z',
      sync_status: 'pending',
    });
    await expect(repositorio.findById(DOCUMENTO.id)).resolves.toBeNull();
    await expect(repositorio.list(USUARIO_DE_TESTE)).resolves.toEqual([]);
  });

  test('delete de id inexistente não cria nem altera linhas', async () => {
    const repositorio = criarRepositorio();
    await repositorio.save(DOCUMENTO);

    await repositorio.delete(criarDocumentoId('999'));

    expect((await linhasSalvas())[0].deleted_at).toBeNull();
  });

  test('guarda o código e o resumo da foto gravados na assinatura e devolve o mesmo documento', async () => {
    const assinado = {
      ...DOCUMENTO,
      codigo: 'AA1;id=1#carimbo' as CodigoDeAutenticidade,
      fotoSha256: 'a'.repeat(64),
    };

    await criarRepositorio().save(assinado);

    expect((await linhasSalvas())[0]).toMatchObject({ codigo: 'AA1;id=1#carimbo', foto_sha256: 'a'.repeat(64) });
    await expect(criarRepositorio().findById(assinado.id)).resolves.toEqual(assinado);
  });

  test('documento sem código (assinado antes de ele ser gravado) guarda nulos e volta igual', async () => {
    await criarRepositorio().save(DOCUMENTO);

    expect((await linhasSalvas())[0]).toMatchObject({ codigo: null, foto_sha256: null });
    await expect(criarRepositorio().findById(DOCUMENTO.id)).resolves.toEqual(DOCUMENTO);
  });

  test('os arquivos nascem marcados como locais, para o sync saber que ainda precisam subir', async () => {
    await criarRepositorio().save(DOCUMENTO);

    expect((await linhasSalvas())[0]).toMatchObject({ foto_status: 'local', pdf_status: 'local' });
  });

  test('guarda os campos aninhados como JSON e devolve o mesmo documento', async () => {
    await criarRepositorio().save(DOCUMENTO);

    const [linha] = await linhasSalvas();

    expect(JSON.parse(String(linha.selo))).toEqual(DOCUMENTO.selo);
    expect(JSON.parse(String(linha.local_assinatura))).toEqual(DOCUMENTO.local);
    await expect(criarRepositorio().findById(DOCUMENTO.id)).resolves.toEqual(DOCUMENTO);
  });
});
