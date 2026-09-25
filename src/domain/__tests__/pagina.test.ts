import { createPixels, createSize } from '../geometry';
import { layoutDaPagina, TAMANHO_DA_FOLHA_A4 } from '../pagina';

describe('layoutDaPagina', () => {
  test('na largura do PDF, a foto em pé encaixa acima do rodapé e fica centralizada na largura', () => {
    const layout = layoutDaPagina(createSize(3024, 4032), createPixels(595));

    expect(layout.pagina).toEqual({ width: 595, height: 841 });
    expect(layout.foto.width).toBeCloseTo(498.75, 3);
    expect(layout.foto.height).toBeCloseTo(665, 3);
    expect(layout.esquerda).toBeCloseTo(48.125, 3);
    expect(layout.topo).toBeCloseTo(24, 3);
  });

  test('a foto deitada ocupa a largura útil e fica no meio da área acima do rodapé', () => {
    const layout = layoutDaPagina(createSize(4032, 3024), createPixels(595));

    expect(layout.foto.width).toBeCloseTo(547);
    expect(layout.foto.height).toBeCloseTo(410.25, 3);
    expect(layout.topo).toBeCloseTo(151.375, 3);
  });

  test('o rodapé de 128 fica dentro da margem de baixo, com o QR de 104 e a legenda de 9', () => {
    const layout = layoutDaPagina(createSize(3024, 4032), createPixels(595));

    expect(layout.rodape).toEqual({ esquerda: 24, topo: 689, largura: 547, altura: 128 });
    expect(layout.ladoDoQr).toBe(104);
    expect(layout.tamanhoDaLegenda).toBe(9);
  });

  test('a foto nunca invade o rodapé', () => {
    for (const tamanho of [createSize(3024, 4032), createSize(4032, 3024), createSize(1000, 5000)]) {
      const layout = layoutDaPagina(tamanho, createPixels(595));

      expect(layout.topo + layout.foto.height).toBeLessThanOrEqual(layout.rodape.topo + 1e-9);
    }
  });

  test('na miniatura, todas as medidas escalam pela largura', () => {
    const noPdf = layoutDaPagina(createSize(3024, 4032), createPixels(595));
    const naMiniatura = layoutDaPagina(createSize(3024, 4032), createPixels(119));

    expect(naMiniatura.pagina.width).toBeCloseTo(noPdf.pagina.width / 5);
    expect(naMiniatura.pagina.height).toBeCloseTo(noPdf.pagina.height / 5);
    expect(naMiniatura.foto.width).toBeCloseTo(noPdf.foto.width / 5);
    expect(naMiniatura.foto.height).toBeCloseTo(noPdf.foto.height / 5);
    expect(naMiniatura.esquerda).toBeCloseTo(noPdf.esquerda / 5);
    expect(naMiniatura.topo).toBeCloseTo(noPdf.topo / 5);
    expect(naMiniatura.rodape.topo).toBeCloseTo(noPdf.rodape.topo / 5);
    expect(naMiniatura.ladoDoQr).toBeCloseTo(noPdf.ladoDoQr / 5);
  });

  test('a folha que o PDF recebe tem 595 × 842', () => {
    expect(TAMANHO_DA_FOLHA_A4).toEqual({ width: 595, height: 842 });
  });
});
