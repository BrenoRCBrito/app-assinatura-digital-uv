import { ValidationError } from '../brand';
import { createIsoDateTime } from '../dateTime';

describe('createIsoDateTime', () => {
  test('aceita a data no formato de toISOString', () => {
    const texto = new Date(2026, 8, 12, 10, 30).toISOString();

    expect(createIsoDateTime(texto)).toBe(texto);
  });

  test('recusa texto que não é data ISO', () => {
    expect(() => createIsoDateTime('ontem')).toThrow(ValidationError);
    expect(() => createIsoDateTime('ontem')).toThrow('Data inválida: ontem');
    expect(() => createIsoDateTime('12/09/2026')).toThrow(ValidationError);
  });

  test('recusa data que não existe no calendário', () => {
    expect(() => createIsoDateTime('2026-02-31T10:00:00.000Z')).toThrow('Data inválida: 2026-02-31T10:00:00.000Z');
  });
});
