import { createSize } from '../geometry';
import { createCapturedPhoto, createFileUri, MAIOR_LADO_DA_FOTO, reducaoDaFoto } from '../photo';

describe('reducaoDaFoto', () => {
  test('foto do tamanho da câmera ou menor fica como está', () => {
    expect(reducaoDaFoto(createSize(3024, 4032))).toBeNull();
    expect(reducaoDaFoto(createSize(4032, 3024))).toBeNull();
    expect(reducaoDaFoto(createSize(800, 600))).toBeNull();
  });

  test('foto maior encolhe pelo lado maior até o tamanho da câmera, mantendo a proporção', () => {
    expect(MAIOR_LADO_DA_FOTO).toBe(4032);
    expect(reducaoDaFoto(createSize(6048, 8064))).toEqual({ height: 4032 });
    expect(reducaoDaFoto(createSize(8064, 6048))).toEqual({ width: 4032 });
    expect(reducaoDaFoto(createSize(5000, 5000))).toEqual({ width: 4032 });
  });
});

describe('photo', () => {
  test('createFileUri aceita o endereço de um arquivo', () => {
    expect(createFileUri('file:///cache/foto.jpg')).toBe('file:///cache/foto.jpg');
  });

  test('createFileUri recusa texto vazio', () => {
    expect(() => createFileUri('   ')).toThrow('Endereço de arquivo vazio.');
  });

  test('createCapturedPhoto guarda o endereço e o tamanho da foto', () => {
    expect(createCapturedPhoto('file:///cache/foto.jpg', 3024, 4032)).toEqual({
      uri: 'file:///cache/foto.jpg',
      size: { width: 3024, height: 4032 },
    });
  });

  test.each([
    [0, 4032],
    [3024, 0],
  ])('createCapturedPhoto recusa foto de %i por %i', (largura, altura) => {
    expect(() => createCapturedPhoto('file:///cache/foto.jpg', largura, altura)).toThrow('A foto veio sem tamanho.');
  });
});
