import { get, ref, remove, set } from 'firebase/database';

import { createBase64, criarDocumentoId } from '../../domain/documento';
import { criarUsuarioId } from '../../domain/usuario';
import { createInMemoryDocumentoAssinadoRepository } from '../../storage/inMemory/inMemoryDocumentoAssinadoRepository';
import { criarDocumentoDeTeste } from '../../storage/testing/documentoAssinadoRepositoryContract';
import { lerFotoDocumentoBase64, lerPdfDocumentoBase64 } from '../fileSystem';
import { obterBancoDeArquivos } from '../firebase';
import { resumirSha256 } from '../hmac';
import {
  MAXIMO_DE_FALHAS_SEGUIDAS,
  sincronizarArquivos,
  TAMANHO_MAXIMO_DO_ARQUIVO,
  TEMPO_LIMITE_DO_ENVIO,
} from '../sincronizacaoDeArquivos';

jest.mock('firebase/database', () => ({ get: jest.fn(), ref: jest.fn(), remove: jest.fn(), set: jest.fn() }));
jest.mock('../fileSystem', () => ({ lerFotoDocumentoBase64: jest.fn(), lerPdfDocumentoBase64: jest.fn() }));
jest.mock('../firebase', () => ({ obterBancoDeArquivos: jest.fn() }));
jest.mock('../hmac', () => ({ resumirSha256: jest.fn() }));

const UID = criarUsuarioId('uid-a');
const BANCO = { nome: 'realtime' };
const FOTO = createBase64('FOTO-EM-BASE64');
const PDF = createBase64('PDF-EM-BASE64');
const SHA_DA_FOTO = 'f'.repeat(64);
const SHA_DO_PDF = 'p'.repeat(63) + '1';
const ASSINADO = '2026-09-12T10:00:00.000Z';

function nuvemSemArquivo() {
  jest.mocked(get).mockResolvedValue({ exists: () => false, val: () => null } as never);
}

function nuvemComResumo(resumo: string) {
  jest.mocked(get).mockResolvedValue({ exists: () => true, val: () => resumo } as never);
}

async function repositorioComDocumento(extra: Partial<ReturnType<typeof criarDocumentoDeTeste>> = {}) {
  const repositorio = createInMemoryDocumentoAssinadoRepository();
  const documento = { ...criarDocumentoDeTeste('d1', 'Contrato', ASSINADO, UID), ...extra };
  await repositorio.save(documento);
  return { repositorio, documento };
}

describe('sincronizarArquivos', () => {
  let aviso: jest.SpyInstance;

  beforeEach(() => {
    aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.mocked(obterBancoDeArquivos).mockReset().mockReturnValue(BANCO as never);
    jest.mocked(ref).mockReset().mockImplementation(((_banco: unknown, caminho: string) => ({ caminho })) as never);
    jest.mocked(get).mockReset();
    jest.mocked(set).mockReset().mockResolvedValue(undefined);
    jest.mocked(remove).mockReset().mockResolvedValue(undefined);
    jest.mocked(lerFotoDocumentoBase64).mockReset().mockResolvedValue(FOTO);
    jest.mocked(lerPdfDocumentoBase64).mockReset().mockResolvedValue(PDF);
    jest
      .mocked(resumirSha256)
      .mockReset()
      .mockImplementation(async (texto: string) => (texto === FOTO ? SHA_DA_FOTO : SHA_DO_PDF));
    nuvemSemArquivo();
  });

  afterEach(() => {
    aviso.mockRestore();
    jest.useRealTimers();
  });

  describe('enviar', () => {
    test('envia a foto e o PDF para arquivos/{uid}/{documento}/{tipo} com o resumo, e marca os dois como enviados', async () => {
      const { repositorio } = await repositorioComDocumento();

      const resultado = await sincronizarArquivos(repositorio, UID);

      expect(resultado).toEqual({ enviados: 2, falhas: 0 });
      expect(ref).toHaveBeenCalledWith(BANCO, 'arquivos/uid-a/d1/foto');
      expect(ref).toHaveBeenCalledWith(BANCO, 'arquivos/uid-a/d1/pdf');
      expect(set).toHaveBeenCalledWith({ caminho: 'arquivos/uid-a/d1/foto' }, { dados: FOTO, sha256: SHA_DA_FOTO });
      expect(set).toHaveBeenCalledWith({ caminho: 'arquivos/uid-a/d1/pdf' }, { dados: PDF, sha256: SHA_DO_PDF });
      await expect(repositorio.listarArquivosParaEnviar(UID)).resolves.toEqual([]);
    });

    test('antes de gravar, consulta só o resumo que já está na nuvem (sem baixar o arquivo)', async () => {
      const { repositorio } = await repositorioComDocumento();

      await sincronizarArquivos(repositorio, UID);

      expect(ref).toHaveBeenCalledWith(BANCO, 'arquivos/uid-a/d1/foto/sha256');
      expect(ref).toHaveBeenCalledWith(BANCO, 'arquivos/uid-a/d1/pdf/sha256');
    });

    test('a segunda sincronização não envia de novo', async () => {
      const { repositorio } = await repositorioComDocumento();
      await sincronizarArquivos(repositorio, UID);
      jest.mocked(set).mockClear();

      const resultado = await sincronizarArquivos(repositorio, UID);

      expect(resultado).toEqual({ enviados: 0, falhas: 0 });
      expect(set).not.toHaveBeenCalled();
    });

    test('se o arquivo já está na nuvem com o mesmo resumo, não grava de novo e conta como enviado', async () => {
      const { repositorio } = await repositorioComDocumento();
      nuvemComResumo(SHA_DA_FOTO);
      jest.mocked(lerPdfDocumentoBase64).mockResolvedValue(FOTO);

      const resultado = await sincronizarArquivos(repositorio, UID);

      expect(resultado.enviados).toBe(2);
      expect(set).not.toHaveBeenCalled();
      await expect(repositorio.listarArquivosParaEnviar(UID)).resolves.toEqual([]);
    });

    test('se a nuvem tem um arquivo diferente no mesmo lugar, não sobrescreve e conta como falha', async () => {
      const { repositorio } = await repositorioComDocumento();
      nuvemComResumo('0'.repeat(64));

      const resultado = await sincronizarArquivos(repositorio, UID);

      expect(resultado).toEqual({ enviados: 0, falhas: 2 });
      expect(set).not.toHaveBeenCalled();
      await expect(repositorio.listarArquivosParaEnviar(UID)).resolves.toHaveLength(2);
    });

    test('foto que não confere com o resumo guardado no documento não sobe', async () => {
      const { repositorio } = await repositorioComDocumento({ fotoSha256: 'b'.repeat(64) });

      const resultado = await sincronizarArquivos(repositorio, UID);

      expect(resultado).toEqual({ enviados: 1, falhas: 1 });
      expect(set).toHaveBeenCalledTimes(1);
      expect(set).toHaveBeenCalledWith({ caminho: 'arquivos/uid-a/d1/pdf' }, expect.anything());
    });

    test('foto que confere com o resumo guardado no documento sobe', async () => {
      const { repositorio } = await repositorioComDocumento({ fotoSha256: SHA_DA_FOTO });

      const resultado = await sincronizarArquivos(repositorio, UID);

      expect(resultado.enviados).toBe(2);
    });

    test('arquivo acima do limite do banco não é enviado', async () => {
      const { repositorio } = await repositorioComDocumento();
      jest.mocked(lerPdfDocumentoBase64).mockResolvedValue(createBase64('a'.repeat(TAMANHO_MAXIMO_DO_ARQUIVO + 1)));

      const resultado = await sincronizarArquivos(repositorio, UID);

      expect(resultado).toEqual({ enviados: 1, falhas: 1 });
      expect(set).toHaveBeenCalledTimes(1);
    });

    test('documento que veio da nuvem (arquivos "remote") não tem o que enviar e nem abre o banco', async () => {
      const { repositorio } = await repositorioComDocumento({ fotoStatus: 'remote', pdfStatus: 'remote' });

      const resultado = await sincronizarArquivos(repositorio, UID);

      expect(resultado).toEqual({ enviados: 0, falhas: 0 });
      expect(obterBancoDeArquivos).not.toHaveBeenCalled();
    });

    test('sem nada para fazer, não abre o banco nem pede arquivos', async () => {
      const repositorio = createInMemoryDocumentoAssinadoRepository();

      await sincronizarArquivos(repositorio, UID);

      expect(obterBancoDeArquivos).not.toHaveBeenCalled();
      expect(lerFotoDocumentoBase64).not.toHaveBeenCalled();
    });

    test('só envia os arquivos da conta logada', async () => {
      const { repositorio } = await repositorioComDocumento();
      await repositorio.save(criarDocumentoDeTeste('x1', 'De outra conta', ASSINADO, criarUsuarioId('uid-b')));

      await sincronizarArquivos(repositorio, UID);

      expect(set).toHaveBeenCalledTimes(2);
      expect(ref).not.toHaveBeenCalledWith(BANCO, expect.stringContaining('x1'));
    });

    test('se um arquivo falha, o outro segue e o que falhou continua para a próxima vez', async () => {
      const { repositorio } = await repositorioComDocumento();
      jest.mocked(set).mockRejectedValueOnce(new Error('PERMISSION_DENIED')).mockResolvedValue(undefined);

      const resultado = await sincronizarArquivos(repositorio, UID);

      expect(resultado).toEqual({ enviados: 1, falhas: 1 });
      const pendentes = await repositorio.listarArquivosParaEnviar(UID);
      expect(pendentes.map(({ tipo }) => tipo)).toEqual(['foto']);
    });

    test('se a nuvem não responde ao envio, desiste depois do limite e o arquivo continua pendente', async () => {
      jest.useFakeTimers();
      const { repositorio } = await repositorioComDocumento();
      jest.mocked(set).mockReturnValue(new Promise<never>(() => undefined));

      const execucao = sincronizarArquivos(repositorio, UID);
      await jest.advanceTimersByTimeAsync(TEMPO_LIMITE_DO_ENVIO * 2);
      const resultado = await execucao;

      expect(resultado.enviados).toBe(0);
      expect(resultado.falhas).toBe(2);
      await expect(repositorio.listarArquivosParaEnviar(UID)).resolves.toHaveLength(2);
    });

    test('depois de várias falhas seguidas, para de tentar (provavelmente sem internet)', async () => {
      const repositorio = createInMemoryDocumentoAssinadoRepository();
      for (const id of ['d1', 'd2', 'd3', 'd4']) {
        await repositorio.save(criarDocumentoDeTeste(id, 'Contrato', ASSINADO, UID));
      }
      jest.mocked(get).mockRejectedValue(new Error('Client is offline'));

      const resultado = await sincronizarArquivos(repositorio, UID);

      expect(resultado).toEqual({ enviados: 0, falhas: MAXIMO_DE_FALHAS_SEGUIDAS });
      expect(get).toHaveBeenCalledTimes(MAXIMO_DE_FALHAS_SEGUIDAS);
    });

    test('um sucesso no meio zera a contagem de falhas seguidas', async () => {
      const repositorio = createInMemoryDocumentoAssinadoRepository();
      for (const id of ['d1', 'd2', 'd3']) {
        await repositorio.save(criarDocumentoDeTeste(id, 'Contrato', ASSINADO, UID));
      }
      const respostas = [false, false, true, false, false, true];
      let indice = 0;
      jest.mocked(get).mockImplementation(async () => {
        if (!respostas[indice++]) {
          throw new Error('instável');
        }
        return { exists: () => false, val: () => null } as never;
      });

      const resultado = await sincronizarArquivos(repositorio, UID);

      expect(resultado).toEqual({ enviados: 2, falhas: 4 });
    });

    test('banco de arquivos não configurado: o erro chega a quem chamou', async () => {
      const { repositorio } = await repositorioComDocumento();
      jest.mocked(obterBancoDeArquivos).mockImplementation(() => {
        throw new Error('Realtime Database não configurado');
      });

      await expect(sincronizarArquivos(repositorio, UID)).rejects.toThrow('não configurado');
    });
  });

  describe('excluir o documento não mexe na nuvem', () => {
    test('a foto e o PDF que já estão na nuvem continuam lá depois que o documento é excluído', async () => {
      const { repositorio } = await repositorioComDocumento();
      await sincronizarArquivos(repositorio, UID);
      jest.mocked(set).mockClear();
      await repositorio.delete(criarDocumentoId('d1'));

      const resultado = await sincronizarArquivos(repositorio, UID);

      expect(resultado).toEqual({ enviados: 0, falhas: 0 });
      expect(remove).not.toHaveBeenCalled();
      expect(set).not.toHaveBeenCalled();
    });

    test('documento excluído antes de os arquivos subirem também não gera nenhuma remoção', async () => {
      const { repositorio } = await repositorioComDocumento();
      await repositorio.delete(criarDocumentoId('d1'));

      await sincronizarArquivos(repositorio, UID);

      expect(remove).not.toHaveBeenCalled();
    });

    test('documento excluído já com os arquivos marcados na nuvem não gera nenhuma remoção', async () => {
      const { repositorio } = await repositorioComDocumento();
      await repositorio.definirArquivoNaNuvem('d1', 'foto', true);
      await repositorio.definirArquivoNaNuvem('d1', 'pdf', true);
      await repositorio.delete(criarDocumentoId('d1'));

      await sincronizarArquivos(repositorio, UID);

      expect(remove).not.toHaveBeenCalled();
    });
  });
});
