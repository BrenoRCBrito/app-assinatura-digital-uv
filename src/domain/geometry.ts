import { ValidationError, type Brand } from './brand';

export type Pixels = Brand<number, 'Pixels'>;

export type Fraction = Brand<number, 'Fraction'>;

export type Size = Readonly<{ width: Pixels; height: Pixels }>;

export type ScreenPoint = Readonly<{ x: Pixels; y: Pixels }>;

export type PlainPoint = Readonly<{ x: number; y: number }>;

export type PlainSize = Readonly<{ width: number; height: number }>;

export function createPixels(value: number): Pixels {
  if (!Number.isFinite(value) || value < 0) {
    throw new ValidationError(`Medida em pixels inválida: ${value}`);
  }
  return value as Pixels;
}

export function createFraction(value: number): Fraction {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new ValidationError(`Fração inválida: ${value}`);
  }
  return value as Fraction;
}

export function createSize(width: number, height: number): Size {
  return { width: createPixels(width), height: createPixels(height) };
}

export function clampPointToSize(x: number, y: number, size: Size): ScreenPoint {
  return {
    x: createPixels(Math.min(Math.max(x, 0), size.width)),
    y: createPixels(Math.min(Math.max(y, 0), size.height)),
  };
}

export function clampToArea(point: PlainPoint, size: PlainSize, area: PlainSize): PlainPoint {
  'worklet';
  return {
    x: Math.min(Math.max(point.x, 0), Math.max(area.width - size.width, 0)),
    y: Math.min(Math.max(point.y, 0), Math.max(area.height - size.height, 0)),
  };
}

export function fitSizeInside(content: Size, area: Size): Size {
  if (content.width === 0 || content.height === 0) {
    return createSize(0, 0);
  }
  const scale = Math.min(area.width / content.width, area.height / content.height);
  return createSize(content.width * scale, content.height * scale);
}

export function distanceBetween(a: ScreenPoint, b: ScreenPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
