import { ValidationError, type Brand } from './brand';

export type IsoDateTime = Brand<string, 'IsoDateTime'>;

const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export function createIsoDateTime(text: string): IsoDateTime {
  if (!ISO_DATE_TIME.test(text) || Number.isNaN(Date.parse(text))) {
    throw new ValidationError(`Data inválida: ${text}`);
  }
  return text as IsoDateTime;
}
