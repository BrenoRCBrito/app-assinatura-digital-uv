import { DEFAULT_SETTINGS, parseSettings } from '../settings';

describe('parseSettings', () => {
  test('devolve o padrão quando não há dado salvo', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });

  test('devolve o padrão quando o dado não é um objeto', () => {
    expect(parseSettings('escuro')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings(42)).toEqual(DEFAULT_SETTINGS);
  });

  test('mantém valores válidos', () => {
    const salvo = { theme: 'dark', gestureEngine: 'reanimated', salvarCopiaNaGaleria: true };

    expect(parseSettings(salvo)).toEqual(salvo);
  });

  test('troca só os campos inválidos pelo padrão', () => {
    expect(parseSettings({ theme: 'sepia', gestureEngine: 'reanimated', salvarCopiaNaGaleria: 'sim' })).toEqual({
      theme: 'light',
      gestureEngine: 'reanimated',
      salvarCopiaNaGaleria: false,
    });
  });

  test('completa com o padrão os campos ausentes', () => {
    expect(parseSettings({ salvarCopiaNaGaleria: true })).toEqual({ ...DEFAULT_SETTINGS, salvarCopiaNaGaleria: true });
  });
});
