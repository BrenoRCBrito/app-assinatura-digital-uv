import { ValidationError, type Brand } from './brand';
import { createPixels, createSize, distanceBetween, type ScreenPoint, type Size } from './geometry';

export type Traco = Brand<string, 'Traco'>;

export type Desenho = Readonly<{
  tracos: readonly Traco[];
  quadro: Size;
}>;

const TRACO = /^M\d+,\d+( L\d+,\d+)*$/;
const DISTANCIA_MINIMA_ENTRE_PONTOS = 2;
const MARGEM_DO_RECORTE = 8;

export function criarTraco(path: string): Traco {
  if (!TRACO.test(path)) {
    throw new ValidationError(`Traço inválido: ${path}`);
  }
  return path as Traco;
}

export function criarDesenho(tracos: readonly Traco[], quadro: Size): Desenho {
  if (tracos.length === 0) {
    throw new ValidationError('Desenhe a assinatura antes de salvar.');
  }
  if (quadro.width === 0 || quadro.height === 0) {
    throw new ValidationError('O quadro do desenho precisa ter largura e altura.');
  }
  return { tracos, quadro };
}

export function adicionarPonto(pontos: readonly ScreenPoint[], ponto: ScreenPoint): readonly ScreenPoint[] {
  const ultimo = pontos.at(-1);
  if (ultimo !== undefined && distanceBetween(ultimo, ponto) < DISTANCIA_MINIMA_ENTRE_PONTOS) {
    return pontos;
  }
  return [...pontos, ponto];
}

export function tracoDePontos(pontos: readonly ScreenPoint[]): Traco {
  if (pontos.length === 0) {
    throw new ValidationError('Um traço precisa de pelo menos um ponto.');
  }
  const [primeiro, ...resto] = pontos;
  const inicio = `M${Math.round(primeiro.x)},${Math.round(primeiro.y)}`;
  const linhas = resto.map((ponto) => `L${Math.round(ponto.x)},${Math.round(ponto.y)}`);
  return criarTraco([inicio, ...linhas].join(' '));
}

function pontosDoTraco(traco: Traco): readonly Readonly<{ x: number; y: number }>[] {
  return [...traco.matchAll(/(\d+),(\d+)/g)].map((coordenada) => ({
    x: Number(coordenada[1]),
    y: Number(coordenada[2]),
  }));
}

export function recortarDesenho(tracos: readonly Traco[]): Desenho {
  if (tracos.length === 0) {
    throw new ValidationError('Desenhe a assinatura antes de salvar.');
  }
  const pontosPorTraco = tracos.map(pontosDoTraco);
  const todosOsPontos = pontosPorTraco.flat();
  const menorX = todosOsPontos.reduce((menor, ponto) => Math.min(menor, ponto.x), Number.POSITIVE_INFINITY);
  const menorY = todosOsPontos.reduce((menor, ponto) => Math.min(menor, ponto.y), Number.POSITIVE_INFINITY);
  const maiorX = todosOsPontos.reduce((maior, ponto) => Math.max(maior, ponto.x), 0);
  const maiorY = todosOsPontos.reduce((maior, ponto) => Math.max(maior, ponto.y), 0);

  const tracosRecortados = pontosPorTraco.map((pontos) =>
    tracoDePontos(
      pontos.map((ponto) => ({
        x: createPixels(ponto.x - menorX + MARGEM_DO_RECORTE),
        y: createPixels(ponto.y - menorY + MARGEM_DO_RECORTE),
      })),
    ),
  );

  return criarDesenho(
    tracosRecortados,
    createSize(maiorX - menorX + 2 * MARGEM_DO_RECORTE, maiorY - menorY + 2 * MARGEM_DO_RECORTE),
  );
}
