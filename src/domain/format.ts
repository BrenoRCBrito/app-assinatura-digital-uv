import type { IsoDateTime } from './dateTime';

function twoDigits(value: number): string {
  return value.toString().padStart(2, '0');
}

export function formatDate(isoDateTime: IsoDateTime): string {
  const date = new Date(isoDateTime);
  return `${twoDigits(date.getDate())}/${twoDigits(date.getMonth() + 1)}/${date.getFullYear()}`;
}
