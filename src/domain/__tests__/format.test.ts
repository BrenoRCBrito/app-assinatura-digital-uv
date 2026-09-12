import { createIsoDateTime } from '../dateTime';
import { formatDate } from '../format';

describe('formatDate', () => {
  test('formata como dd/mm/aaaa no fuso do aparelho', () => {
    const criadaEm = createIsoDateTime(new Date(2026, 8, 5, 23, 59).toISOString());

    expect(formatDate(criadaEm)).toBe('05/09/2026');
  });
});
