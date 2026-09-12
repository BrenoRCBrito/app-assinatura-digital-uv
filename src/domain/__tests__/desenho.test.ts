import { ValidationError } from '../brand';
import { adicionarPonto, criarDesenho, criarTraco, tracoDePontos } from '../desenho';
import { clampPointToSize, createSize } from '../geometry';

const quadro = createSize(300, 150);

function ponto(x: number, y: number) {
  return clampPointToSize(x, y, quadro);
}

describe('criarTraco', () => {
  test('aceita path que começa com M e usa coordenadas inteiras', () => {
    expect(criarTraco('M10,20 L12,24')).toBe('M10,20 L12,24');
    expect(criarTraco('M0,0')).toBe('M0,0');
  });

  test('recusa path fora do formato', () => {
    expect(() => criarTraco('L10,20')).toThrow(ValidationError);
    expect(() => criarTraco('M10.5,20')).toThrow('Traço inválido: M10.5,20');
    expect(() => criarTraco('')).toThrow(ValidationError);
  });
});

describe('criarDesenho', () => {
  test('cria o desenho com traços e quadro', () => {
    const tracos = [criarTraco('M10,20 L12,24')];

    expect(criarDesenho(tracos, quadro)).toEqual({ tracos, quadro });
  });

  test('exige pelo menos um traço', () => {
    expect(() => criarDesenho([], quadro)).toThrow('Desenhe a assinatura antes de salvar.');
  });

  test('exige quadro com largura e altura', () => {
    expect(() => criarDesenho([criarTraco('M10,20')], createSize(0, 150))).toThrow(
      'O quadro do desenho precisa ter largura e altura.',
    );
  });
});

describe('adicionarPonto', () => {
  test('adiciona o primeiro ponto', () => {
    expect(adicionarPonto([], ponto(10, 10))).toEqual([ponto(10, 10)]);
  });

  test('descarta ponto a menos de 2 px do anterior', () => {
    const pontos = [ponto(10, 10)];

    expect(adicionarPonto(pontos, ponto(11, 11))).toBe(pontos);
  });

  test('adiciona ponto a 2 px ou mais do anterior', () => {
    expect(adicionarPonto([ponto(10, 10)], ponto(12, 10))).toEqual([ponto(10, 10), ponto(12, 10)]);
  });
});

describe('tracoDePontos', () => {
  test('monta o path com coordenadas arredondadas', () => {
    expect(tracoDePontos([ponto(10.4, 20.6), ponto(15, 25)])).toBe('M10,21 L15,25');
  });

  test('recusa lista vazia', () => {
    expect(() => tracoDePontos([])).toThrow('Um traço precisa de pelo menos um ponto.');
  });
});
