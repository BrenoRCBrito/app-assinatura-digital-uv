import { criarDocumentoId } from '../../domain/documento';
import { createCapturedPhoto, createFileUri } from '../../domain/photo';
import {
  copiarFotoDocumento,
  excluirArquivosDocumento,
  guardarPdfDocumento,
  lerFotoDocumentoBase64,
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
  }

  return { Directory, File, Paths: { document: { uri: 'file:///app' } } };
});

const mockOperacoes: unknown[][] = [];
const mockExistentes = new Set<string>();
let mockBase64 = '';

const ID = criarDocumentoId('1757680000000');
const PASTA = 'file:///app/documentos/1757680000000';

describe('arquivos do documento', () => {
  beforeEach(() => {
    mockOperacoes.length = 0;
    mockExistentes.clear();
    mockBase64 = '';
  });

  test('monta os endereços da foto e do PDF dentro da pasta do documento', () => {
    expect([uriFotoDocumento(ID), uriPdfDocumento(ID)]).toEqual([`${PASTA}/foto.jpg`, `${PASTA}/documento.pdf`]);
  });

  test('cria a pasta e copia a foto da câmera para ela', async () => {
    await copiarFotoDocumento(ID, createCapturedPhoto('file:///cache/foto.jpg', 3024, 4032));

    expect(mockOperacoes).toEqual([
      ['criar pasta', PASTA, { intermediates: true, idempotent: true }],
      ['copiar', 'file:///cache/foto.jpg', `${PASTA}/foto.jpg`, { overwrite: true }],
    ]);
  });

  test('lê a foto guardada em base64', async () => {
    mockBase64 = '/9j/4AAQ';

    await expect(lerFotoDocumentoBase64(ID)).resolves.toBe('/9j/4AAQ');
    expect(mockOperacoes).toEqual([['ler base64', `${PASTA}/foto.jpg`]]);
  });

  test('move o PDF gerado para a pasta do documento', async () => {
    await guardarPdfDocumento(ID, createFileUri('file:///cache/Print/documento.pdf'));

    expect(mockOperacoes).toEqual([
      ['mover', 'file:///cache/Print/documento.pdf', `${PASTA}/documento.pdf`, { overwrite: true }],
    ]);
  });

  test('apaga a pasta do documento só quando ela existe', () => {
    excluirArquivosDocumento(ID);
    mockExistentes.add(PASTA);
    excluirArquivosDocumento(ID);

    expect(mockOperacoes).toEqual([['apagar pasta', PASTA]]);
  });
});
