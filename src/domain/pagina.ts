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
// A página fica 1 px abaixo da folha: com a altura exata, o expo-print do Android conta uma página a mais
// (PrintPDFRenderTask.kt:95), e na sonda de 2026-09-14 a página menor saiu com uma página só no iPhone.
const ALTURA_DA_PAGINA = 841;
const MARGEM = 12;
const LADO_DO_QR = 104;
const ALTURA_DO_RODAPE = LADO_DO_QR;
const TAMANHO_DA_LEGENDA = 9;

export const TAMANHO_DA_FOLHA_A4: Size = createSize(LARGURA_DA_FOLHA, ALTURA_DA_FOLHA);

export function layoutDaPagina(tamanhoFoto: Size, largura: Pixels): LayoutDaPagina {
  const escala = largura / LARGURA_DA_FOLHA;
  const pagina = createSize(largura, ALTURA_DA_PAGINA * escala);
  const margem = MARGEM * escala;
  const alturaDoRodape = ALTURA_DO_RODAPE * escala;
  const areaDaFoto = createSize(pagina.width - 2 * margem, pagina.height - 2 * margem - alturaDoRodape);
  const foto = fitSizeInside(tamanhoFoto, areaDaFoto);

  return {
    pagina,
    foto,
    esquerda: createPixels((pagina.width - foto.width) / 2),
    topo: createPixels(margem + (areaDaFoto.height - foto.height) / 2),
    rodape: {
      esquerda: createPixels(margem),
      topo: createPixels(pagina.height - margem - alturaDoRodape),
      largura: createPixels(pagina.width - 2 * margem),
      altura: createPixels(alturaDoRodape),
    },
    ladoDoQr: createPixels(LADO_DO_QR * escala),
    tamanhoDaLegenda: createPixels(TAMANHO_DA_LEGENDA * escala),
  };
}
