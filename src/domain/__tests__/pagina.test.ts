import { createPixels, createSize } from '../geometry';
import { layoutDaPagina, TAMANHO_DA_FOLHA_A4 } from '../pagina';

describe('layoutDaPagina', () => {
  test('na largura do PDF, a página tem 595 × 841 e a foto em pé fica centralizada dentro da margem de 24', () => {
    const layout = layoutDaPagina(createSize(3024, 4032), createPixels(595));

    expect(layout.pagina).toEqual({ width: 595, height: 841 });
    expect(layout.foto.width).toBeCloseTo(547);
    expect(layout.foto.height).toBeCloseTo(729.333, 3);
    expect(layout.esquerda).toBeCloseTo(24);
    expect(layout.topo).toBeCloseTo(55.833, 3);
  });

  test('a foto deitada ocupa a largura útil e fica no meio da altura', () => {
    const layout = layoutDaPagina(createSize(4032, 3024), createPixels(595));

    expect(layout.foto.width).toBeCloseTo(547);
    expect(layout.foto.height).toBeCloseTo(410.25, 3);
    expect(layout.topo).toBeCloseTo(215.375, 3);
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
  });

  test('a folha que o PDF recebe tem 595 × 842', () => {
    expect(TAMANHO_DA_FOLHA_A4).toEqual({ width: 595, height: 842 });
  });
});
