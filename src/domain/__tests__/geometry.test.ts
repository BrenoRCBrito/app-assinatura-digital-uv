import { ValidationError } from '../brand';
import {
  clampPointToSize,
  clampToArea,
  createFraction,
  createPixels,
  createSize,
  distanceBetween,
  fitSizeInside,
} from '../geometry';

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

describe('createFraction', () => {
  test('aceita valores de 0 a 1', () => {
    expect([createFraction(0), createFraction(0.35), createFraction(1)]).toEqual([0, 0.35, 1]);
  });

  test('recusa valores fora do intervalo e não finitos', () => {
    expect(() => createFraction(-0.01)).toThrow('Fração inválida: -0.01');
    expect(() => createFraction(1.01)).toThrow(ValidationError);
    expect(() => createFraction(Number.NaN)).toThrow(ValidationError);
  });
});

describe('clampToArea', () => {
  const area = { width: 300, height: 400 };
  const selo = { width: 100, height: 60 };

  test('mantém a posição que cabe na área', () => {
    expect(clampToArea({ x: 20, y: 30 }, selo, area)).toEqual({ x: 20, y: 30 });
  });

  test('encosta o selo nas bordas sem deixar sair', () => {
    expect(clampToArea({ x: -15, y: 390 }, selo, area)).toEqual({ x: 0, y: 340 });
    expect(clampToArea({ x: 250, y: -1 }, selo, area)).toEqual({ x: 200, y: 0 });
  });

  test('um selo maior que a área fica no canto de cima à esquerda', () => {
    expect(clampToArea({ x: 10, y: 10 }, { width: 400, height: 500 }, area)).toEqual({ x: 0, y: 0 });
  });
});

describe('fitSizeInside', () => {
  test('uma foto em pé ocupa a altura da área', () => {
    expect(fitSizeInside(createSize(600, 800), createSize(300, 300))).toEqual({ width: 225, height: 300 });
  });

  test('uma foto deitada ocupa a largura da área', () => {
    expect(fitSizeInside(createSize(800, 600), createSize(300, 300))).toEqual({ width: 300, height: 225 });
  });

  test('conteúdo sem largura ou altura vira tamanho zero', () => {
    expect(fitSizeInside(createSize(0, 100), createSize(300, 300))).toEqual({ width: 0, height: 0 });
  });
});
