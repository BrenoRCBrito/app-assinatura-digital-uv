import { createFraction, createPixels, createSize } from '../geometry';
import {
  aumentarSelo,
  diminuirSelo,
  larguraInicialDoSelo,
  larguraMaximaDoSelo,
  layoutDoSelo,
  limitarLarguraDoSelo,
  paraPontoNaArea,
  paraPosicaoSelo,
  podeAumentarSelo,
  podeDiminuirSelo,
  posicaoInicialDoSelo,
} from '../selo';

describe('tamanho do selo', () => {
  const sessentaPorCento = createFraction(0.6);

  test('começa com 35% da largura da foto', () => {
    expect(larguraInicialDoSelo()).toBe(0.35);
  });

  test('aumenta e diminui em passos de 5% sem erro de arredondamento', () => {
    expect(aumentarSelo(createFraction(0.35), sessentaPorCento)).toBe(0.4);
    expect(diminuirSelo(createFraction(0.35))).toBe(0.3);
    expect(aumentarSelo(aumentarSelo(createFraction(0.5), sessentaPorCento), sessentaPorCento)).toBe(0.6);
  });

  test('para em 15% e em 60%', () => {
    expect([diminuirSelo(createFraction(0.15)), aumentarSelo(createFraction(0.6), sessentaPorCento)]).toEqual([
      0.15, 0.6,
    ]);
    expect([
      podeDiminuirSelo(createFraction(0.15)),
      podeAumentarSelo(createFraction(0.6), sessentaPorCento),
    ]).toEqual([false, false]);
    expect([
      podeDiminuirSelo(createFraction(0.2)),
      podeAumentarSelo(createFraction(0.55), sessentaPorCento),
    ]).toEqual([true, true]);
  });

  test('com foto em pé e assinatura larga, o máximo continua 60%', () => {
    expect(larguraMaximaDoSelo(createSize(3024, 4032), createSize(300, 150))).toBe(0.6);
  });

  test('com foto deitada e assinatura alta, o máximo é a maior largura em que o selo cabe na altura', () => {
    const foto = createSize(4032, 3024);
    const quadro = createSize(300, 400);
    const maxima = larguraMaximaDoSelo(foto, quadro);

    expect(maxima).toBe(0.47);
    expect(layoutDoSelo(maxima, foto, quadro).tamanho.height).toBeLessThanOrEqual(foto.height);
    expect(layoutDoSelo(createFraction(0.48), foto, quadro).tamanho.height).toBeGreaterThan(foto.height);
  });

  test('o passo para no máximo da foto, e a largura pedida fica limitada a ele', () => {
    const maxima = createFraction(0.47);

    expect(aumentarSelo(createFraction(0.45), maxima)).toBe(0.47);
    expect([podeAumentarSelo(createFraction(0.45), maxima), podeAumentarSelo(maxima, maxima)]).toEqual([true, false]);
    expect([
      limitarLarguraDoSelo(createFraction(0.6), maxima),
      limitarLarguraDoSelo(createFraction(0.35), maxima),
    ]).toEqual([0.47, 0.35]);
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
