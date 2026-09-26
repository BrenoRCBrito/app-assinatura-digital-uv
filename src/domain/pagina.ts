import { createPixels, createSize, type Pixels, type Size } from './geometry';

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
const MARGEM = 12;
const LADO_DO_QR = 104;
const ALTURA_DO_RODAPE = LADO_DO_QR;
const TAMANHO_DA_LEGENDA = 9;

export const LARGURA_DA_FOLHA_A4: Pixels = createPixels(LARGURA_DA_FOLHA);

export function layoutDaPagina(tamanhoFoto: Size, largura: Pixels): LayoutDaPagina {
  const escala = largura / LARGURA_DA_FOLHA;
  const margem = MARGEM * escala;
  const alturaDoRodape = ALTURA_DO_RODAPE * escala;
  const larguraDaFoto = largura - 2 * margem;
  const alturaDaFoto = (larguraDaFoto * tamanhoFoto.height) / tamanhoFoto.width;
  const foto = createSize(larguraDaFoto, alturaDaFoto);
  const pagina = createSize(largura, margem + foto.height + margem + alturaDoRodape + margem);

  return {
    pagina,
    foto,
    esquerda: createPixels(margem),
    topo: createPixels(margem),
    rodape: {
      esquerda: createPixels(margem),
      topo: createPixels(margem + foto.height + margem),
      largura: createPixels(largura - 2 * margem),
      altura: createPixels(alturaDoRodape),
    },
    ladoDoQr: createPixels(LADO_DO_QR * escala),
    tamanhoDaLegenda: createPixels(TAMANHO_DA_LEGENDA * escala),
  };
}
