import { createPixels, createSize, fitSizeInside, type Pixels, type Size } from './geometry';

export type RodapeDaPagina = Readonly<{
  esquerda: Pixels;
  topo: Pixels;
  largura: Pixels;
  altura: Pixels;
}>;

export type LayoutDaPagina = Readonly<{
  pagina: Size;
  foto: Size;
  esquerda: Pixels;
  topo: Pixels;
  rodape: RodapeDaPagina;
  ladoDoQr: Pixels;
  tamanhoDaLegenda: Pixels;
}>;

const LARGURA_DA_FOLHA = 595;
const ALTURA_DA_FOLHA = 842;
const MARGEM = 12;
const LADO_DO_QR = 104;
const ALTURA_DO_RODAPE = LADO_DO_QR;
const TAMANHO_DA_LEGENDA = 9;

export const LARGURA_DA_FOLHA_A4: Pixels = createPixels(LARGURA_DA_FOLHA);
export const ALTURA_DA_FOLHA_A4: Pixels = createPixels(ALTURA_DA_FOLHA);

// A folha é sempre A4: o rodapé com o QR fica no pé, e a foto encolhe até caber inteira no espaço de cima,
// centralizada e com a proporção real. Sobra papel nas laterais (foto em pé mais alongada que o A4) ou em cima
// e embaixo (foto deitada), mas nada do documento é cortado.
export function layoutDaPagina(tamanhoFoto: Size, largura: Pixels): LayoutDaPagina {
  const escala = largura / LARGURA_DA_FOLHA;
  const margem = MARGEM * escala;
  const alturaDoRodape = ALTURA_DO_RODAPE * escala;
  const pagina = createSize(largura, ALTURA_DA_FOLHA * escala);
  const topoDoRodape = pagina.height - margem - alturaDoRodape;
  const areaDaFoto = createSize(largura - 2 * margem, topoDoRodape - 2 * margem);
  const foto = fitSizeInside(tamanhoFoto, areaDaFoto);

  return {
    pagina,
    foto,
    esquerda: createPixels(margem + (areaDaFoto.width - foto.width) / 2),
    topo: createPixels(margem + (areaDaFoto.height - foto.height) / 2),
    rodape: {
      esquerda: createPixels(margem),
      topo: createPixels(topoDoRodape),
      largura: createPixels(largura - 2 * margem),
      altura: createPixels(alturaDoRodape),
    },
    ladoDoQr: createPixels(LADO_DO_QR * escala),
    tamanhoDaLegenda: createPixels(TAMANHO_DA_LEGENDA * escala),
  };
}
