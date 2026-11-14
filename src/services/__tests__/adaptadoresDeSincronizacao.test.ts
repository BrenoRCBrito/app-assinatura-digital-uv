import { criarAssinaturaId, criarNomeAssinatura } from '../../domain/assinatura';
import { criarCodigoCurto } from '../../domain/codigoCurto';
import { criarDocumentoId, criarTituloDocumento } from '../../domain/documento';
import { criarUsuarioId } from '../../domain/usuario';
import { createInMemoryAssinaturaRepository } from '../../storage/inMemory/inMemoryAssinaturaRepository';
import { createInMemoryDocumentoAssinadoRepository } from '../../storage/inMemory/inMemoryDocumentoAssinadoRepository';
import { criarAssinaturaDeTeste } from '../../storage/testing/assinaturaRepositoryContract';
import { criarDocumentoDeTeste } from '../../storage/testing/documentoAssinadoRepositoryContract';
import { adaptadorDeAssinaturas, adaptadorDeDocumentos } from '../adaptadoresDeSincronizacao';

const UID = criarUsuarioId('uid-a');
const CRIADO = '2026-09-12T10:00:00.000Z';
const ATUALIZADO = '2026-10-02T10:00:00.000Z';

const DESENHO_NA_NUVEM = { tracos: ['M10,20 L30,40'], quadro: { width: 300, height: 150 } };

function assinaturaDaNuvem(extra: Readonly<Record<string, unknown>> = {}) {
  return {
    nome: 'Rubrica',
    desenho: DESENHO_NA_NUVEM,
    createdAt: CRIADO,
    updatedAt: ATUALIZADO,
    deletedAt: null,
    servidorEm: { seconds: 1, nanoseconds: 2 },
    ...extra,
  };
}

function documentoDaNuvem(extra: Readonly<Record<string, unknown>> = {}) {
  return {
    titulo: 'Contrato de locação',
    assinaturaUsada: { nome: 'Rubrica', desenho: DESENHO_NA_NUVEM },
    tamanhoFoto: { width: 3024, height: 4032 },
    selo: { x: 0.4, y: 0.65, largura: 0.35, cor: 'escura' },
    local: { coordenadas: { latitude: -22.40418, longitude: -43.66283 }, cidade: 'Vassouras', endereco: null },
    assinadoEm: CRIADO,
    codigo: '7K3F9QXZM2P4',
    fotoSha256: 'a'.repeat(64),
    createdAt: CRIADO,
    updatedAt: ATUALIZADO,
    deletedAt: null,
    servidorEm: { seconds: 1, nanoseconds: 2 },
    ...extra,
  };
}

describe('adaptadorDeAssinaturas', () => {
  const adaptador = adaptadorDeAssinaturas(createInMemoryAssinaturaRepository());
  const item = criarAssinaturaDeTeste('a1', 'Rubrica', CRIADO, UID);

  test('usa a coleção assinaturas', () => {
    expect(adaptador.colecao).toBe('assinaturas');
  });

  test('paraNuvem leva exatamente os campos que as regras aceitam (sem o servidorEm, que o motor acrescenta)', () => {
    const dados = adaptador.paraNuvem({ item, createdAt: CRIADO, updatedAt: ATUALIZADO, deletedAt: null });

    expect(Object.keys(dados).sort()).toEqual(['createdAt', 'deletedAt', 'desenho', 'nome', 'updatedAt']);
    expect(dados).toEqual({
      nome: 'Rubrica',
      desenho: DESENHO_NA_NUVEM,
      createdAt: CRIADO,
      updatedAt: ATUALIZADO,
      deletedAt: null,
    });
  });

  test('o que sobe e volta é a mesma assinatura', () => {
    const registro = { item, createdAt: CRIADO, updatedAt: ATUALIZADO, deletedAt: ATUALIZADO };

    expect(adaptador.daNuvem('a1', UID, adaptador.paraNuvem(registro))).toEqual(registro);
  });

  test('daNuvem usa o createdAt como data de criação da assinatura', () => {
    expect(adaptador.daNuvem('a2', UID, assinaturaDaNuvem()).item).toMatchObject({
      id: criarAssinaturaId('a2'),
      usuarioId: UID,
      nome: criarNomeAssinatura('Rubrica'),
      criadaEm: CRIADO,
    });
  });

  test.each([
    ['nome vazio', { nome: '' }],
    ['traço fora do formato', { desenho: { tracos: ['qualquer coisa'], quadro: { width: 1, height: 1 } } }],
    ['sem desenho', { desenho: undefined }],
    ['sem data de criação', { createdAt: undefined }],
    ['data de atualização que não é texto', { updatedAt: 5 }],
  ])('daNuvem recusa assinatura com %s', (_nome, extra) => {
    expect(() => adaptador.daNuvem('a1', UID, assinaturaDaNuvem(extra))).toThrow();
  });
});

describe('adaptadorDeDocumentos', () => {
  const adaptador = adaptadorDeDocumentos(createInMemoryDocumentoAssinadoRepository());
  const item = {
    ...criarDocumentoDeTeste('d1', 'Contrato de locação', CRIADO, UID),
    codigo: criarCodigoCurto('7K3F9QXZM2P4'),
    fotoSha256: 'a'.repeat(64),
  };

  test('usa a coleção documentos', () => {
    expect(adaptador.colecao).toBe('documentos');
  });

  test('paraNuvem leva exatamente os campos que as regras aceitam, sem foto, PDF nem estado dos arquivos', () => {
    const dados = adaptador.paraNuvem({ item, createdAt: CRIADO, updatedAt: ATUALIZADO, deletedAt: null });

    expect(Object.keys(dados).sort()).toEqual(
      [
        'assinadoEm',
        'assinaturaUsada',
        'codigo',
        'createdAt',
        'deletedAt',
        'fotoSha256',
        'local',
        'selo',
        'tamanhoFoto',
        'titulo',
        'updatedAt',
      ].sort(),
    );
    expect(dados).toEqual(documentoDaNuvemSemServidor());
  });

  test('documento sem cidade, sem código e sem resumo da foto vai com null, nunca undefined', () => {
    const antigo = {
      ...criarDocumentoDeTeste('d2', 'Antigo', CRIADO, UID),
      local: { coordenadas: { latitude: 0, longitude: 0 }, cidade: null },
    } as never;

    const dados = adaptador.paraNuvem({ item: antigo, createdAt: CRIADO, updatedAt: ATUALIZADO, deletedAt: null });

    expect(dados).toMatchObject({ codigo: null, fotoSha256: null, local: { cidade: null } });
    expect(JSON.stringify(dados)).not.toContain('undefined');
    expect(Object.values(dados)).not.toContain(undefined);
  });

  test('o que sobe e volta é o mesmo documento, com foto e PDF marcados como "remote"', () => {
    const registro = { item, createdAt: CRIADO, updatedAt: ATUALIZADO, deletedAt: null };

    const volta = adaptador.daNuvem('d1', UID, adaptador.paraNuvem(registro));

    expect(volta).toEqual({ ...registro, item: { ...item, fotoStatus: 'remote', pdfStatus: 'remote' } });
  });

  test('a cor branca do selo sobe e volta', () => {
    const claro = { ...item, selo: { ...item.selo, cor: 'clara' as const } };
    const registro = { item: claro, createdAt: CRIADO, updatedAt: ATUALIZADO, deletedAt: null };

    const dados = adaptador.paraNuvem(registro);

    expect(dados.selo).toEqual({ x: 0.4, y: 0.65, largura: 0.35, cor: 'clara' });
    expect(adaptador.daNuvem('d1', UID, dados).item.selo.cor).toBe('clara');
  });

  test('o endereço aproximado sobe e volta; documento antigo, sem o campo, volta sem endereço', () => {
    const ENDERECO = 'Rua das Flores, 123 - Centro, Vassouras - RJ';
    const comEndereco = { ...item, local: { ...item.local, endereco: ENDERECO as never } };
    const registro = { item: comEndereco, createdAt: CRIADO, updatedAt: ATUALIZADO, deletedAt: null };

    const dados = adaptador.paraNuvem(registro);
    const antigo = documentoDaNuvem({
      local: { coordenadas: { latitude: -22.40418, longitude: -43.66283 }, cidade: 'Vassouras' },
    });

    expect(dados.local).toMatchObject({ endereco: ENDERECO });
    expect(adaptador.daNuvem('d1', UID, dados).item.local.endereco).toBe(ENDERECO);
    expect(adaptador.daNuvem('d1', UID, antigo).item.local.endereco).toBeNull();
  });

  test('documento que subiu antes de existir a cor do selo volta com o selo escuro', () => {
    const volta = adaptador.daNuvem('d1', UID, documentoDaNuvem({ selo: { x: 0.4, y: 0.65, largura: 0.35 } }));

    expect(volta.item.selo.cor).toBe('escura');
  });

  test('daNuvem monta o documento com o id do caminho e o dono da conta', () => {
    expect(adaptador.daNuvem('d9', UID, documentoDaNuvem()).item).toMatchObject({
      id: criarDocumentoId('d9'),
      usuarioId: UID,
      titulo: criarTituloDocumento('Contrato de locação'),
      fotoStatus: 'remote',
      pdfStatus: 'remote',
    });
  });

  test.each([
    ['título vazio', { titulo: '' }],
    ['latitude fora do mundo', { local: { coordenadas: { latitude: 91, longitude: 0 }, cidade: null } }],
    ['resumo da foto inválido', { fotoSha256: 'ABC' }],
    ['posição do selo fora do quadro', { selo: { x: 2, y: 0.5, largura: 0.3 } }],
    ['sem assinatura usada', { assinaturaUsada: undefined }],
    ['sem data da assinatura', { assinadoEm: undefined }],
  ])('daNuvem recusa documento com %s', (_nome, extra) => {
    expect(() => adaptador.daNuvem('d1', UID, documentoDaNuvem(extra))).toThrow();
  });

  function documentoDaNuvemSemServidor() {
    const { servidorEm: _ignorado, ...resto } = documentoDaNuvem();
    return resto;
  }
});
