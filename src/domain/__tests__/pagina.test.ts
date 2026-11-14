import { createPixels, createSize } from '../geometry';
import { ALTURA_DA_FOLHA_A4, layoutDaPagina, LARGURA_DA_FOLHA_A4 } from '../pagina';

const EM_PE = createSize(3024, 4032);
const DEITADA = createSize(4032, 3024);
const DA_CAMERA_DO_APP = createSize(2662, 4032);

describe('layoutDaPagina', () => {
  test('a folha é sempre A4, qualquer que seja a proporção da foto', () => {
    for (const tamanho of [EM_PE, DEITADA, DA_CAMERA_DO_APP, createSize(1000, 5000), createSize(5000, 1000)]) {
      const { pagina } = layoutDaPagina(tamanho, createPixels(595));

      expect(pagina.width).toBe(595);
      expect(pagina.height).toBeCloseTo(842, 6);
    }
  });

  test('o rodapé fica no pé da folha, do tamanho exato do QR', () => {
    const layout = layoutDaPagina(EM_PE, createPixels(595));

    expect(layout.rodape.topo).toBeCloseTo(842 - 12 - 104, 6);
    expect(layout.rodape.altura).toBe(104);
    expect(layout.rodape.esquerda).toBe(12);
    expect(layout.rodape.largura).toBeCloseTo(571, 6);
    expect(layout.ladoDoQr).toBe(104);
    expect(layout.tamanhoDaLegenda).toBe(9);
  });

  test('a foto em pé encolhe até caber na altura, inteira e centralizada, com faixas nas laterais', () => {
    const layout = layoutDaPagina(EM_PE, createPixels(595));

    expect(layout.foto.height).toBeCloseTo(702, 6);
    expect(layout.foto.width).toBeCloseTo(526.5, 6);
    expect(layout.topo).toBeCloseTo(12, 6);
    expect(layout.esquerda).toBeCloseTo(12 + (571 - 526.5) / 2, 6);
  });

  test('a foto deitada ocupa a largura toda, centralizada na altura', () => {
    const layout = layoutDaPagina(DEITADA, createPixels(595));

    expect(layout.foto.width).toBeCloseTo(571, 6);
    expect(layout.foto.height).toBeCloseTo(428.25, 6);
    expect(layout.esquerda).toBeCloseTo(12, 6);
    expect(layout.topo).toBeCloseTo(12 + (702 - 428.25) / 2, 6);
  });

  test('a foto mantém a proporção real e nunca invade o rodapé nem sai da folha', () => {
    for (const tamanho of [EM_PE, DEITADA, DA_CAMERA_DO_APP, createSize(1000, 5000), createSize(5000, 1000)]) {
      const layout = layoutDaPagina(tamanho, createPixels(595));

      expect(layout.foto.width / layout.foto.height).toBeCloseTo(tamanho.width / tamanho.height, 6);
      expect(layout.esquerda).toBeGreaterThanOrEqual(12 - 1e-9);
      expect(layout.esquerda + layout.foto.width).toBeLessThanOrEqual(595 - 12 + 1e-9);
      expect(layout.topo).toBeGreaterThanOrEqual(12 - 1e-9);
      expect(layout.topo + layout.foto.height).toBeLessThanOrEqual(layout.rodape.topo - 12 + 1e-9);
    }
  });

  test('na miniatura, todas as medidas escalam pela largura', () => {
    const noPdf = layoutDaPagina(EM_PE, createPixels(595));
    const naMiniatura = layoutDaPagina(EM_PE, createPixels(119));

    expect(naMiniatura.pagina.width).toBeCloseTo(noPdf.pagina.width / 5);
    expect(naMiniatura.pagina.height).toBeCloseTo(noPdf.pagina.height / 5);
    expect(naMiniatura.foto.width).toBeCloseTo(noPdf.foto.width / 5);
    expect(naMiniatura.foto.height).toBeCloseTo(noPdf.foto.height / 5);
    expect(naMiniatura.esquerda).toBeCloseTo(noPdf.esquerda / 5);
    expect(naMiniatura.topo).toBeCloseTo(noPdf.topo / 5);
    expect(naMiniatura.rodape.topo).toBeCloseTo(noPdf.rodape.topo / 5);
    expect(naMiniatura.ladoDoQr).toBeCloseTo(noPdf.ladoDoQr / 5);
  });

  test('a folha A4 usada pro PDF tem 595 × 842', () => {
    expect(LARGURA_DA_FOLHA_A4).toBe(595);
    expect(ALTURA_DA_FOLHA_A4).toBe(842);
  });
});
