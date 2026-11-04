import { gerarId } from '../id';

describe('gerarId', () => {
  test('gera um UUID diferente a cada chamada', () => {
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

    expect(gerarId()).toMatch(UUID);
    expect(gerarId()).not.toBe(gerarId());
  });
});
