import { ValidationError, type Brand } from './brand';

export type Pixels = Brand<number, 'Pixels'>;

export type Size = Readonly<{ width: Pixels; height: Pixels }>;

export type ScreenPoint = Readonly<{ x: Pixels; y: Pixels }>;

export function createPixels(value: number): Pixels {
  if (!Number.isFinite(value) || value < 0) {
    throw new ValidationError(`Medida em pixels inválida: ${value}`);
  }
  return value as Pixels;
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

export function distanceBetween(a: ScreenPoint, b: ScreenPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
