import { createPixels, createSize } from '../geometry';
import { layoutDaPagina, LARGURA_DA_FOLHA_A4 } from '../pagina';

describe('layoutDaPagina', () => {
  test('a foto sempre preenche toda a largura útil', () => {
    const layout = layoutDaPagina(createSize(3024, 4032), createPixels(595));

    expect(layout.esquerda).toBeCloseTo(12, 3);
    expect(layout.topo).toBeCloseTo(12, 3);
    expect(layout.foto.width).toBeCloseTo(571, 3);
  });

  test('a altura da foto acompanha a proporção real, em pé', () => {
    const layout = layoutDaPagina(createSize(3024, 4032), createPixels(595));

    expect(layout.foto.height).toBeCloseTo(761.333, 2);
    expect(layout.pagina.height).toBeCloseTo(901.333, 2);
  });

  test('a altura da foto acompanha a proporção real, deitada', () => {
    const layout = layoutDaPagina(createSize(4032, 3024), createPixels(595));

    expect(layout.foto.height).toBeCloseTo(428.25, 2);
    expect(layout.pagina.height).toBeCloseTo(568.25, 2);
  });

  test('o rodapé fica logo abaixo da foto, do tamanho exato do QR', () => {
    const layout = layoutDaPagina(createSize(3024, 4032), createPixels(595));

    expect(layout.rodape.topo).toBeCloseTo(785.333, 2);
    expect(layout.rodape.altura).toBe(104);
    expect(layout.rodape.esquerda).toBe(12);
    expect(layout.rodape.largura).toBeCloseTo(571, 3);
    expect(layout.ladoDoQr).toBe(104);
    expect(layout.tamanhoDaLegenda).toBe(9);
  });

  test('a foto nunca invade o rodapé, pra qualquer proporção', () => {
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

  test('a largura da folha A4 usada pro PDF é 595', () => {
    expect(LARGURA_DA_FOLHA_A4).toBe(595);
  });
});
