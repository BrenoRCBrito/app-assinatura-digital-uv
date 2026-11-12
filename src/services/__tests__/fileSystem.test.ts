import { createBase64, criarDocumentoId } from '../../domain/documento';
import { criarUsuarioId } from '../../domain/usuario';
import { createCapturedPhoto, createFileUri } from '../../domain/photo';
import {
  copiarFotoDocumento,
  excluirArquivosDocumento,
  guardarFotoDocumento,
  guardarPdfDocumento,
  lerFotoDocumentoBase64,
  lerPdfDocumentoBase64,
  uriFotoDocumento,
  uriPdfDocumento,
} from '../fileSystem';

jest.mock('expo-file-system', () => {
  function juntar(partes: readonly unknown[]): string {
    return partes.map((parte) => (typeof parte === 'string' ? parte : (parte as { uri: string }).uri)).join('/');
  }

  class Directory {
    readonly uri: string;

    constructor(...partes: unknown[]) {
      this.uri = juntar(partes);
    }

    get exists() {
      return mockExistentes.has(this.uri);
    }

    create(opcoes: unknown) {
      mockOperacoes.push(['criar pasta', this.uri, opcoes]);
    }

    delete() {
      mockOperacoes.push(['apagar pasta', this.uri]);
    }
  }

  class File {
    readonly uri: string;

    constructor(...partes: unknown[]) {
      this.uri = juntar(partes);
    }

    copy(destino: { uri: string }, opcoes: unknown) {
      mockOperacoes.push(['copiar', this.uri, destino.uri, opcoes]);
      return Promise.resolve();
    }

    move(destino: { uri: string }, opcoes: unknown) {
      mockOperacoes.push(['mover', this.uri, destino.uri, opcoes]);
      return Promise.resolve();
    }

    base64() {
      mockOperacoes.push(['ler base64', this.uri]);
      return Promise.resolve(mockBase64);
    }

    write(conteudo: string, opcoes: unknown) {
      mockOperacoes.push(['escrever', this.uri, conteudo, opcoes]);
    }
  }

  return { Directory, File, Paths: { document: { uri: 'file:///app' } } };
});

const mockOperacoes: unknown[][] = [];
const mockExistentes = new Set<string>();
let mockBase64 = '';

const DOCUMENTO = { id: criarDocumentoId('1757680000000'), usuarioId: criarUsuarioId('42') };
const OUTRA_CONTA = { id: DOCUMENTO.id, usuarioId: criarUsuarioId('43') };
const PASTA = 'file:///app/usuarios/42/documentos/1757680000000';
const PASTA_ANTIGA = 'file:///app/documentos/1757680000000';

describe('arquivos do documento', () => {
  beforeEach(() => {
    mockOperacoes.length = 0;
    mockExistentes.clear();
    mockBase64 = '';
  });

  test('monta os endereços da foto e do PDF dentro da pasta da conta e do documento', () => {
    expect([uriFotoDocumento(DOCUMENTO), uriPdfDocumento(DOCUMENTO)]).toEqual([
      `${PASTA}/foto.jpg`,
      `${PASTA}/documento.pdf`,
    ]);
  });

  test('cada conta tem a própria pasta, mesmo para o mesmo id de documento', () => {
    expect(uriFotoDocumento(OUTRA_CONTA)).toBe('file:///app/usuarios/43/documentos/1757680000000/foto.jpg');
  });

  test('cria a pasta e copia a foto da câmera para ela', async () => {
    await copiarFotoDocumento(DOCUMENTO, createCapturedPhoto('file:///cache/foto.jpg', 3024, 4032));

    expect(mockOperacoes).toEqual([
      ['criar pasta', PASTA, { intermediates: true, idempotent: true }],
      ['copiar', 'file:///cache/foto.jpg', `${PASTA}/foto.jpg`, { overwrite: true }],
    ]);
  });

  test('lê a foto guardada em base64', async () => {
    mockBase64 = '/9j/4AAQ';

    await expect(lerFotoDocumentoBase64(DOCUMENTO)).resolves.toBe('/9j/4AAQ');
    expect(mockOperacoes).toEqual([['ler base64', `${PASTA}/foto.jpg`]]);
  });

  test('grava a foto recebida em base64 na pasta do documento', async () => {
    await guardarFotoDocumento(DOCUMENTO, createBase64('/9j/4AAQ'));

    expect(mockOperacoes).toEqual([
      ['criar pasta', PASTA, { intermediates: true, idempotent: true }],
      ['escrever', `${PASTA}/foto.jpg`, '/9j/4AAQ', { encoding: 'base64' }],
    ]);
  });

  test('lê o PDF guardado em base64', async () => {
    mockBase64 = 'JVBERi0xLjQK';

    await expect(lerPdfDocumentoBase64(DOCUMENTO)).resolves.toBe('JVBERi0xLjQK');
    expect(mockOperacoes).toEqual([['ler base64', `${PASTA}/documento.pdf`]]);
  });

  test('grava o PDF recebido em base64 na pasta do documento', async () => {
    await guardarPdfDocumento(DOCUMENTO, createBase64('JVBERi0xLjQK'));

    expect(mockOperacoes).toEqual([
      ['criar pasta', PASTA, { intermediates: true, idempotent: true }],
      ['escrever', `${PASTA}/documento.pdf`, 'JVBERi0xLjQK', { encoding: 'base64' }],
    ]);
  });

  test('apaga a pasta do documento só quando ela existe', () => {
    excluirArquivosDocumento(DOCUMENTO);
    mockExistentes.add(PASTA);
    excluirArquivosDocumento(DOCUMENTO);

    expect(mockOperacoes).toEqual([['apagar pasta', PASTA]]);
  });

  describe('documentos assinados antes de cada conta ter a própria pasta', () => {
    test('enquanto só existe a pasta antiga, os arquivos continuam sendo achados nela', async () => {
      mockExistentes.add(PASTA_ANTIGA);
      mockBase64 = '/9j/4AAQ';

      expect(uriFotoDocumento(DOCUMENTO)).toBe(`${PASTA_ANTIGA}/foto.jpg`);
      expect(uriPdfDocumento(DOCUMENTO)).toBe(`${PASTA_ANTIGA}/documento.pdf`);
      await expect(lerFotoDocumentoBase64(DOCUMENTO)).resolves.toBe('/9j/4AAQ');
      expect(mockOperacoes).toEqual([['ler base64', `${PASTA_ANTIGA}/foto.jpg`]]);
    });

    test('excluir apaga a pasta antiga', () => {
      mockExistentes.add(PASTA_ANTIGA);

      excluirArquivosDocumento(DOCUMENTO);

      expect(mockOperacoes).toEqual([['apagar pasta', PASTA_ANTIGA]]);
    });

    test('quando as duas existem, vale a pasta nova', () => {
      mockExistentes.add(PASTA_ANTIGA);
      mockExistentes.add(PASTA);

      expect(uriFotoDocumento(DOCUMENTO)).toBe(`${PASTA}/foto.jpg`);
    });

    test('um documento novo, sem nenhuma das duas pastas, é criado na pasta nova', async () => {
      await guardarPdfDocumento(DOCUMENTO, createBase64('JVBERi0xLjQK'));

      expect(mockOperacoes[0]).toEqual(['criar pasta', PASTA, { intermediates: true, idempotent: true }]);
    });
  });
});
