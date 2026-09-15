import { createPixels, createSize, fitSizeInside, type Pixels, type Size } from './geometry';

export type LayoutDaPagina = Readonly<{
  pagina: Size;
  foto: Size;
  esquerda: Pixels;
  topo: Pixels;
}>;

const LARGURA_DA_FOLHA = 595;
const ALTURA_DA_FOLHA = 842;
// A página fica 1 px abaixo da folha: com a altura exata, o expo-print do Android conta uma página a mais
// (PrintPDFRenderTask.kt:95), e na sonda de 2026-09-14 a página menor saiu com uma página só no iPhone.
const ALTURA_DA_PAGINA = 841;
const MARGEM = 24;

export const TAMANHO_DA_FOLHA_A4: Size = createSize(LARGURA_DA_FOLHA, ALTURA_DA_FOLHA);

export function layoutDaPagina(tamanhoFoto: Size, largura: Pixels): LayoutDaPagina {
  const escala = largura / LARGURA_DA_FOLHA;
  const pagina = createSize(largura, ALTURA_DA_PAGINA * escala);
  const margem = MARGEM * escala;
  const foto = fitSizeInside(tamanhoFoto, createSize(pagina.width - 2 * margem, pagina.height - 2 * margem));

  return {
    pagina,
    foto,
    esquerda: createPixels((pagina.width - foto.width) / 2),
    topo: createPixels((pagina.height - foto.height) / 2),
  };
}
