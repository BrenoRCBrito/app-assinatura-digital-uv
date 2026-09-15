import type { IsoDateTime } from './dateTime';
import type { Coordinates, LocalAssinatura } from './documento';
import type { Fraction } from './geometry';

const COORDINATE_DECIMALS = 5;

function twoDigits(value: number): string {
  return value.toString().padStart(2, '0');
}

export function formatDate(isoDateTime: IsoDateTime): string {
  const date = new Date(isoDateTime);
  return `${twoDigits(date.getDate())}/${twoDigits(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function formatDateTime(isoDateTime: IsoDateTime): string {
  const date = new Date(isoDateTime);
  return `${formatDate(isoDateTime)} ${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}`;
}

export function formatPercent(fraction: Fraction): string {
  return `${Math.round(fraction * 100)}%`;
}

export function formatCoordinates({ latitude, longitude }: Coordinates): string {
  return `${latitude.toFixed(COORDINATE_DECIMALS)}, ${longitude.toFixed(COORDINATE_DECIMALS)}`;
}

export function formatLocal(local: LocalAssinatura): string {
  return local.cidade ?? formatCoordinates(local.coordenadas);
}
