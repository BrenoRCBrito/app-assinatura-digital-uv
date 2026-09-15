import { createIsoDateTime } from '../dateTime';
import { createLatitude, createLongitude } from '../documento';
import { formatCoordinates, formatDate, formatDateTime, formatPercent } from '../format';
import { createFraction } from '../geometry';

describe('formatDate', () => {
  test('formata como dd/mm/aaaa no fuso do aparelho', () => {
    const criadaEm = createIsoDateTime(new Date(2026, 8, 5, 23, 59).toISOString());

    expect(formatDate(criadaEm)).toBe('05/09/2026');
  });
});

describe('formatDateTime', () => {
  test('formata como dd/mm/aaaa hh:mm no fuso do aparelho', () => {
    const assinadoEm = createIsoDateTime(new Date(2026, 8, 5, 7, 3).toISOString());

    expect(formatDateTime(assinadoEm)).toBe('05/09/2026 07:03');
  });
});

describe('formatPercent', () => {
  test('mostra a fração como porcentagem inteira', () => {
    expect([createFraction(0.35), createFraction(0.6), createFraction(0.15)].map(formatPercent)).toEqual([
      '35%',
      '60%',
      '15%',
    ]);
  });
});

describe('formatCoordinates', () => {
  test('mostra latitude e longitude com 5 casas, separadas por vírgula', () => {
    expect(formatCoordinates({ latitude: createLatitude(-22.404183), longitude: createLongitude(-43.66283) })).toBe(
      '-22.40418, -43.66283',
    );
  });
});
