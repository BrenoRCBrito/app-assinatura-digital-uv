import { ValidationError } from '../brand';
import { clampPointToSize, createPixels, createSize, distanceBetween } from '../geometry';

describe('createPixels', () => {
  test('aceita zero e números positivos', () => {
    expect(createPixels(0)).toBe(0);
    expect(createPixels(12.5)).toBe(12.5);
  });

  test('recusa negativo, infinito e NaN', () => {
    expect(() => createPixels(-1)).toThrow(ValidationError);
    expect(() => createPixels(-1)).toThrow('Medida em pixels inválida: -1');
    expect(() => createPixels(Number.POSITIVE_INFINITY)).toThrow(ValidationError);
    expect(() => createPixels(Number.NaN)).toThrow(ValidationError);
  });
});

describe('createSize', () => {
  test('cria o tamanho a partir de largura e altura', () => {
    expect(createSize(300, 150)).toEqual({ width: 300, height: 150 });
  });
});

describe('clampPointToSize', () => {
  const quadro = createSize(300, 150);

  test('mantém um ponto que já está dentro do quadro', () => {
    expect(clampPointToSize(10, 20, quadro)).toEqual({ x: 10, y: 20 });
  });

  test('traz para a borda um ponto fora do quadro', () => {
    expect(clampPointToSize(-5, 400, quadro)).toEqual({ x: 0, y: 150 });
  });
});

describe('distanceBetween', () => {
  test('calcula a distância em linha reta', () => {
    const quadro = createSize(300, 150);

    expect(distanceBetween(clampPointToSize(0, 0, quadro), clampPointToSize(3, 4, quadro))).toBe(5);
  });
});
