import { ValidationError, type Brand } from './brand';
import { distanceBetween, type ScreenPoint, type Size } from './geometry';

export type Traco = Brand<string, 'Traco'>;

export type Desenho = Readonly<{
  tracos: readonly Traco[];
  quadro: Size;
}>;

const TRACO = /^M\d+,\d+( L\d+,\d+)*$/;
const DISTANCIA_MINIMA_ENTRE_PONTOS = 2;

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
