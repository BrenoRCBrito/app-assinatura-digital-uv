import { get, ref } from 'firebase/database';

import { criarUsuarioId } from '../../domain/usuario';
import { createInMemoryDocumentoAssinadoRepository } from '../../storage/inMemory/inMemoryDocumentoAssinadoRepository';
import { criarDocumentoDeTeste } from '../../storage/testing/documentoAssinadoRepositoryContract';
import { baixarArquivosDoDocumento, TEMPO_LIMITE_DO_DOWNLOAD } from '../baixarArquivosDoDocumento';
import { guardarFotoDocumento, guardarPdfDocumento } from '../fileSystem';
import { obterBancoDeArquivos } from '../firebase';
import { resumirSha256 } from '../crypto';

jest.mock('firebase/database', () => ({ get: jest.fn(), ref: jest.fn() }));
jest.mock('../fileSystem', () => ({ guardarFotoDocumento: jest.fn(), guardarPdfDocumento: jest.fn() }));
jest.mock('../firebase', () => ({ obterBancoDeArquivos: jest.fn() }));
jest.mock('../crypto', () => ({ resumirSha256: jest.fn() }));

const UID = criarUsuarioId('uid-a');
const BANCO = { nome: 'realtime' };
const SHA_DA_FOTO = 'f'.repeat(64);
const SHA_DO_PDF = 'p'.repeat(63) + '1';
const ASSINADO = '2026-09-12T10:00:00.000Z';

type ArquivoNaNuvem = Readonly<{ dados: string; sha256: string }> | null;

function nuvem(arquivos: Readonly<{ foto: ArquivoNaNuvem; pdf: ArquivoNaNuvem }>) {
  jest.mocked(get).mockImplementation((async (referencia: { caminho: string }) => {
    const arquivo = referencia.caminho.endsWith('/foto') ? arquivos.foto : arquivos.pdf;
    return { exists: () => arquivo !== null, val: () => arquivo };
  }) as never);
}

const FOTO_NA_NUVEM = { dados: 'FOTO-EM-BASE64', sha256: SHA_DA_FOTO };
const PDF_NA_NUVEM = { dados: 'PDF-EM-BASE64', sha256: SHA_DO_PDF };

async function documentoSoNaNuvem(extra: Partial<ReturnType<typeof criarDocumentoDeTeste>> = {}) {
  const repositorio = createInMemoryDocumentoAssinadoRepository();
  const documento = {
    ...criarDocumentoDeTeste('d1', 'Contrato', ASSINADO, UID),
    fotoStatus: 'remote' as const,
    pdfStatus: 'remote' as const,
    ...extra,
  };
  await repositorio.aplicarDaNuvem({ item: documento, createdAt: ASSINADO, updatedAt: ASSINADO, deletedAt: null });
  return { repositorio, documento };
}

describe('baixarArquivosDoDocumento', () => {
  let aviso: jest.SpyInstance;

  beforeEach(() => {
    aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.mocked(obterBancoDeArquivos).mockReset().mockReturnValue(BANCO as never);
    jest.mocked(ref).mockReset().mockImplementation(((_banco: unknown, caminho: string) => ({ caminho })) as never);
    jest.mocked(get).mockReset();
    jest.mocked(guardarFotoDocumento).mockReset().mockResolvedValue(undefined);
    jest.mocked(guardarPdfDocumento).mockReset().mockResolvedValue(undefined);
    jest
      .mocked(resumirSha256)
      .mockReset()
      .mockImplementation(async (texto: string) => (texto === 'FOTO-EM-BASE64' ? SHA_DA_FOTO : SHA_DO_PDF));
    nuvem({ foto: FOTO_NA_NUVEM, pdf: PDF_NA_NUVEM });
  });

  afterEach(() => {
    aviso.mockRestore();
    jest.useRealTimers();
  });

  test('baixa a foto e o PDF de arquivos/{uid}/{documento}/{tipo}, grava no aparelho e marca os dois como locais', async () => {
    const { repositorio, documento } = await documentoSoNaNuvem();

    const resultado = await baixarArquivosDoDocumento(repositorio, documento);

    expect(resultado).toEqual({ baixados: 2, ausentes: 0, falhas: 0 });
    expect(ref).toHaveBeenCalledWith(BANCO, 'arquivos/uid-a/d1/foto');
    expect(ref).toHaveBeenCalledWith(BANCO, 'arquivos/uid-a/d1/pdf');
    expect(guardarFotoDocumento).toHaveBeenCalledWith(documento, 'FOTO-EM-BASE64');
    expect(guardarPdfDocumento).toHaveBeenCalledWith(documento, 'PDF-EM-BASE64');
    await expect(repositorio.findById(documento.id, UID)).resolves.toMatchObject({
      fotoStatus: 'local',
      pdfStatus: 'local',
    });
  });

  test('baixar não deixa o documento pendente de envio nem manda os arquivos de volta', async () => {
    const { repositorio, documento } = await documentoSoNaNuvem();

    await baixarArquivosDoDocumento(repositorio, documento);

    await expect(repositorio.listarPendentes(UID)).resolves.toEqual([]);
    await expect(repositorio.listarArquivosParaEnviar(UID)).resolves.toEqual([]);
  });

  test('baixa só o que falta: com a foto já no aparelho, busca apenas o PDF', async () => {
    const { repositorio, documento } = await documentoSoNaNuvem({ fotoStatus: 'local' });

    const resultado = await baixarArquivosDoDocumento(repositorio, documento);

    expect(resultado).toEqual({ baixados: 1, ausentes: 0, falhas: 0 });
    expect(ref).not.toHaveBeenCalledWith(BANCO, 'arquivos/uid-a/d1/foto');
    expect(guardarFotoDocumento).not.toHaveBeenCalled();
  });

  test('documento que já tem tudo no aparelho: não faz nada nem abre o banco', async () => {
    const { repositorio, documento } = await documentoSoNaNuvem({ fotoStatus: 'local', pdfStatus: 'local' });

    const resultado = await baixarArquivosDoDocumento(repositorio, documento);

    expect(resultado).toEqual({ baixados: 0, ausentes: 0, falhas: 0 });
    expect(obterBancoDeArquivos).not.toHaveBeenCalled();
  });

  test('arquivo que ainda não está na nuvem conta como ausente e nada é gravado', async () => {
    const { repositorio, documento } = await documentoSoNaNuvem();
    nuvem({ foto: null, pdf: null });

    const resultado = await baixarArquivosDoDocumento(repositorio, documento);

    expect(resultado).toEqual({ baixados: 0, ausentes: 2, falhas: 0 });
    expect(guardarFotoDocumento).not.toHaveBeenCalled();
    await expect(repositorio.findById(documento.id, UID)).resolves.toMatchObject({
      fotoStatus: 'remote',
      pdfStatus: 'remote',
    });
  });

  test('foto na nuvem e PDF ausente: baixa um e conta o outro como ausente', async () => {
    const { repositorio, documento } = await documentoSoNaNuvem();
    nuvem({ foto: FOTO_NA_NUVEM, pdf: null });

    const resultado = await baixarArquivosDoDocumento(repositorio, documento);

    expect(resultado).toEqual({ baixados: 1, ausentes: 1, falhas: 0 });
    await expect(repositorio.findById(documento.id, UID)).resolves.toMatchObject({
      fotoStatus: 'local',
      pdfStatus: 'remote',
    });
  });

  test('arquivo cujo resumo não bate com o conteúdo está corrompido: não é gravado', async () => {
    const { repositorio, documento } = await documentoSoNaNuvem();
    nuvem({ foto: { dados: 'FOTO-EM-BASE64', sha256: '0'.repeat(64) }, pdf: PDF_NA_NUVEM });

    const resultado = await baixarArquivosDoDocumento(repositorio, documento);

    expect(resultado).toEqual({ baixados: 1, ausentes: 0, falhas: 1 });
    expect(guardarFotoDocumento).not.toHaveBeenCalled();
    await expect(repositorio.findById(documento.id, UID)).resolves.toMatchObject({ fotoStatus: 'remote' });
  });

  test('foto que não é a assinada (resumo diferente do que está no documento) não é aceita', async () => {
    const { repositorio, documento } = await documentoSoNaNuvem({ fotoSha256: 'b'.repeat(64) });

    const resultado = await baixarArquivosDoDocumento(repositorio, documento);

    expect(resultado).toEqual({ baixados: 1, ausentes: 0, falhas: 1 });
    expect(guardarFotoDocumento).not.toHaveBeenCalled();
    expect(guardarPdfDocumento).toHaveBeenCalledTimes(1);
  });

  test('foto que bate com o resumo do documento é aceita', async () => {
    const { repositorio, documento } = await documentoSoNaNuvem({ fotoSha256: SHA_DA_FOTO });

    const resultado = await baixarArquivosDoDocumento(repositorio, documento);

    expect(resultado).toEqual({ baixados: 2, ausentes: 0, falhas: 0 });
  });

  test.each([
    ['sem o conteúdo', { sha256: SHA_DA_FOTO }],
    ['conteúdo vazio', { dados: '', sha256: SHA_DA_FOTO }],
    ['sem o resumo', { dados: 'FOTO-EM-BASE64' }],
    ['conteúdo que não é texto', { dados: 123, sha256: SHA_DA_FOTO }],
  ])('arquivo da nuvem %s é recusado', async (_nome, arquivo) => {
    const { repositorio, documento } = await documentoSoNaNuvem({ pdfStatus: 'local' });
    nuvem({ foto: arquivo as never, pdf: null });

    const resultado = await baixarArquivosDoDocumento(repositorio, documento);

    expect(resultado).toEqual({ baixados: 0, ausentes: 0, falhas: 1 });
    expect(guardarFotoDocumento).not.toHaveBeenCalled();
  });

  test('erro de rede em um arquivo não impede o outro', async () => {
    const { repositorio, documento } = await documentoSoNaNuvem();
    jest
      .mocked(get)
      .mockRejectedValueOnce(new Error('Client is offline'))
      .mockResolvedValueOnce({ exists: () => true, val: () => PDF_NA_NUVEM } as never);

    const resultado = await baixarArquivosDoDocumento(repositorio, documento);

    expect(resultado).toEqual({ baixados: 1, ausentes: 0, falhas: 1 });
    await expect(repositorio.findById(documento.id, UID)).resolves.toMatchObject({
      fotoStatus: 'remote',
      pdfStatus: 'local',
    });
  });

  test('falha ao gravar o arquivo no aparelho não marca como baixado', async () => {
    const { repositorio, documento } = await documentoSoNaNuvem({ pdfStatus: 'local' });
    jest.mocked(guardarFotoDocumento).mockRejectedValue(new Error('Sem espaço'));

    const resultado = await baixarArquivosDoDocumento(repositorio, documento);

    expect(resultado).toEqual({ baixados: 0, ausentes: 0, falhas: 1 });
    await expect(repositorio.findById(documento.id, UID)).resolves.toMatchObject({ fotoStatus: 'remote' });
  });

  test('se a nuvem não responde, desiste depois do limite', async () => {
    jest.useFakeTimers();
    const { repositorio, documento } = await documentoSoNaNuvem({ pdfStatus: 'local' });
    jest.mocked(get).mockReturnValue(new Promise<never>(() => undefined));

    const execucao = baixarArquivosDoDocumento(repositorio, documento);
    await jest.advanceTimersByTimeAsync(TEMPO_LIMITE_DO_DOWNLOAD);
    const resultado = await execucao;

    expect(resultado).toEqual({ baixados: 0, ausentes: 0, falhas: 1 });
  });

  test('banco de arquivos não configurado: o erro chega a quem chamou', async () => {
    const { repositorio, documento } = await documentoSoNaNuvem();
    jest.mocked(obterBancoDeArquivos).mockImplementation(() => {
      throw new Error('Realtime Database não configurado');
    });

    await expect(baixarArquivosDoDocumento(repositorio, documento)).rejects.toThrow('não configurado');
  });
});
