import { ValidationError } from '../../domain/brand';
import { createColorToken, darkTheme, lightTheme } from '../appTheme';

describe('createColorToken', () => {
  test('aceita hex de seis dígitos e rgba', () => {
    expect(createColorToken('#0D1B2A')).toBe('#0D1B2A');
    expect(createColorToken('rgba(65, 90, 119, 0.28)')).toBe('rgba(65, 90, 119, 0.28)');
  });

  test('recusa o que não é cor aceita no tema', () => {
    expect(() => createColorToken('azul')).toThrow(ValidationError);
    expect(() => createColorToken('azul')).toThrow('Cor inválida no tema: azul');
    expect(() => createColorToken('#FFF')).toThrow('Cor inválida no tema: #FFF');
  });

  test('recusa canal rgba acima de 255', () => {
    expect(() => createColorToken('rgba(256, 0, 0, 0.5)')).toThrow('Cor inválida no tema: rgba(256, 0, 0, 0.5)');
  });
});

describe('temas', () => {
  test('claro e escuro têm os mesmos tokens', () => {
    expect(Object.keys(darkTheme).sort()).toEqual(Object.keys(lightTheme).sort());
  });
});
