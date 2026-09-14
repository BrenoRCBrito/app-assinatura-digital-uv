import { createCapturedPhoto, createFileUri } from '../photo';

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
