import { createFraction, createPixels, createSize } from '../geometry';
import {
  aumentarSelo,
  diminuirSelo,
  larguraInicialDoSelo,
  layoutDoSelo,
  paraPontoNaArea,
  paraPosicaoSelo,
  podeAumentarSelo,
  podeDiminuirSelo,
  posicaoInicialDoSelo,
} from '../selo';

describe('tamanho do selo', () => {
  test('começa com 35% da largura da foto', () => {
    expect(larguraInicialDoSelo()).toBe(0.35);
  });

  test('aumenta e diminui em passos de 5% sem erro de arredondamento', () => {
    expect(aumentarSelo(createFraction(0.35))).toBe(0.4);
    expect(diminuirSelo(createFraction(0.35))).toBe(0.3);
    expect(aumentarSelo(aumentarSelo(createFraction(0.5)))).toBe(0.6);
  });

  test('para em 15% e em 60%', () => {
    expect([diminuirSelo(createFraction(0.15)), aumentarSelo(createFraction(0.6))]).toEqual([0.15, 0.6]);
    expect([podeDiminuirSelo(createFraction(0.15)), podeAumentarSelo(createFraction(0.6))]).toEqual([false, false]);
    expect([podeDiminuirSelo(createFraction(0.2)), podeAumentarSelo(createFraction(0.55))]).toEqual([true, true]);
  });
});

describe('layoutDoSelo', () => {
  test('usa a largura da foto, a proporção do desenho e a faixa de 25%', () => {
    expect(layoutDoSelo(createFraction(0.5), createSize(400, 600), createSize(300, 150))).toEqual({
      tamanho: { width: 200, height: 150 },
      alturaDoDesenho: 100,
      alturaDaFaixa: 50,
      alturaDaLinha: 25,
      tamanhoDaFonte: 20,
    });
  });
});

describe('posicaoInicialDoSelo', () => {
  test('centraliza na horizontal com o topo em 65% da altura', () => {
    expect(posicaoInicialDoSelo(createSize(200, 100), createSize(400, 1000))).toEqual({ x: 100, y: 650 });
  });

  test('sobe o selo para ele caber inteiro na foto', () => {
    expect(posicaoInicialDoSelo(createSize(200, 300), createSize(400, 600))).toEqual({ x: 100, y: 300 });
  });
});

describe('conversão da posição', () => {
  const area = createSize(400, 800);
  const ponto = { x: createPixels(100), y: createPixels(200) };

  test('paraPosicaoSelo guarda a posição e a largura em frações da área', () => {
    expect(paraPosicaoSelo(ponto, createSize(200, 120), area)).toEqual({ x: 0.25, y: 0.25, largura: 0.5 });
  });

  test('paraPontoNaArea volta a posição para pixels da área', () => {
    expect(paraPontoNaArea(paraPosicaoSelo(ponto, createSize(200, 120), area), area)).toEqual({ x: 100, y: 200 });
  });
});
