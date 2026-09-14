import {
  clampToArea,
  createFraction,
  createPixels,
  createSize,
  type Fraction,
  type Pixels,
  type ScreenPoint,
  type Size,
} from './geometry';

export type PosicaoSelo = Readonly<{ x: Fraction; y: Fraction; largura: Fraction }>;

export type LayoutDoSelo = Readonly<{
  tamanho: Size;
  alturaDoDesenho: Pixels;
  alturaDaFaixa: Pixels;
  alturaDaLinha: Pixels;
  tamanhoDaFonte: Pixels;
}>;

const LARGURA_INICIAL = 0.35;
const LARGURA_MINIMA = 0.15;
const LARGURA_MAXIMA = 0.6;
const PASSO_DA_LARGURA = 0.05;
const TOPO_INICIAL = 0.65;
const PROPORCAO_DA_FAIXA = 0.25;
const LINHAS_DA_FAIXA = 2;
const PROPORCAO_DA_FONTE = 0.8;

function arredondarLargura(valor: number): Fraction {
  return createFraction(Math.round(valor * 100) / 100);
}

export function larguraInicialDoSelo(): Fraction {
  return createFraction(LARGURA_INICIAL);
}

export function podeAumentarSelo(largura: Fraction): boolean {
  return largura < LARGURA_MAXIMA;
}

export function podeDiminuirSelo(largura: Fraction): boolean {
  return largura > LARGURA_MINIMA;
}

export function aumentarSelo(largura: Fraction): Fraction {
  return arredondarLargura(Math.min(largura + PASSO_DA_LARGURA, LARGURA_MAXIMA));
}

export function diminuirSelo(largura: Fraction): Fraction {
  return arredondarLargura(Math.max(largura - PASSO_DA_LARGURA, LARGURA_MINIMA));
}

export function layoutDoSelo(largura: Fraction, foto: Size, quadro: Size): LayoutDoSelo {
  const larguraEmPixels = largura * foto.width;
  const alturaDoDesenho = (larguraEmPixels * quadro.height) / quadro.width;
  const alturaDaFaixa = larguraEmPixels * PROPORCAO_DA_FAIXA;
  const alturaDaLinha = alturaDaFaixa / LINHAS_DA_FAIXA;

  return {
    tamanho: createSize(larguraEmPixels, alturaDoDesenho + alturaDaFaixa),
    alturaDoDesenho: createPixels(alturaDoDesenho),
    alturaDaFaixa: createPixels(alturaDaFaixa),
    alturaDaLinha: createPixels(alturaDaLinha),
    tamanhoDaFonte: createPixels(alturaDaLinha * PROPORCAO_DA_FONTE),
  };
}

export function posicaoInicialDoSelo(tamanho: Size, foto: Size): ScreenPoint {
  const ponto = clampToArea({ x: (foto.width - tamanho.width) / 2, y: foto.height * TOPO_INICIAL }, tamanho, foto);
  return { x: createPixels(ponto.x), y: createPixels(ponto.y) };
}

export function paraPosicaoSelo(ponto: ScreenPoint, tamanho: Size, area: Size): PosicaoSelo {
  return {
    x: createFraction(ponto.x / area.width),
    y: createFraction(ponto.y / area.height),
    largura: createFraction(tamanho.width / area.width),
  };
}

export function paraPontoNaArea(posicao: PosicaoSelo, area: Size): ScreenPoint {
  return { x: createPixels(posicao.x * area.width), y: createPixels(posicao.y * area.height) };
}
