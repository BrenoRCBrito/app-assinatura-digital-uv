import {
  criarAssinaturaId,
  criarNomeAssinatura,
  ordenarAssinaturasMaisNovasPrimeiro,
  paraAssinatura,
  type Assinatura,
} from '../assinatura';
import { ValidationError } from '../brand';
import { createIsoDateTime } from '../dateTime';
import { criarDesenho, criarTraco } from '../desenho';
import { createSize } from '../geometry';
import { criarUsuarioId } from '../usuario';

function assinaturaValida(id: string, criadaEm: string): Assinatura {
  return {
    id: criarAssinaturaId(id),
    usuarioId: criarUsuarioId('1'),
    nome: criarNomeAssinatura('Rubrica'),
    desenho: criarDesenho([criarTraco('M10,20 L30,40')], createSize(300, 150)),
    criadaEm: createIsoDateTime(criadaEm),
  };
}


describe('criarAssinaturaId', () => {
  test('gera um id numérico a partir do relógio', () => {
    expect(criarAssinaturaId()).toMatch(/^\d+$/);
  });

  test('aceita um id numérico salvo e recusa outro formato', () => {
    expect(criarAssinaturaId('1757680000000')).toBe('1757680000000');
    expect(() => criarAssinaturaId('abc')).toThrow('Id de assinatura inválido: abc');
  });
});

describe('criarNomeAssinatura', () => {
  test('remove espaços das pontas', () => {
    expect(criarNomeAssinatura('  Rubrica  ')).toBe('Rubrica');
  });

  test('exige um nome', () => {
    expect(() => criarNomeAssinatura('   ')).toThrow(ValidationError);
    expect(() => criarNomeAssinatura('   ')).toThrow('Dê um nome à assinatura.');
  });

  test('aceita 40 caracteres e recusa 41', () => {
    expect(criarNomeAssinatura('a'.repeat(40))).toHaveLength(40);
    expect(() => criarNomeAssinatura('a'.repeat(41))).toThrow('O nome da assinatura tem no máximo 40 caracteres.');
  });
});

describe('ordenarAssinaturasMaisNovasPrimeiro', () => {
  test('coloca a mais nova primeiro sem alterar a lista original', () => {
    const antiga = assinaturaValida('1', '2026-09-10T10:00:00.000Z');
    const nova = assinaturaValida('2', '2026-09-12T10:00:00.000Z');
    const lista = [antiga, nova];

    expect(ordenarAssinaturasMaisNovasPrimeiro(lista)).toEqual([nova, antiga]);
    expect(lista).toEqual([antiga, nova]);
  });
});

describe('paraAssinatura', () => {
  test('reconstrói uma assinatura salva em JSON', () => {
    const assinatura = assinaturaValida('1757680000000', '2026-09-12T10:00:00.000Z');

    expect(paraAssinatura(JSON.parse(JSON.stringify(assinatura)))).toEqual(assinatura);
  });

  test('lança erro quando falta um campo', () => {
    const { id, desenho, criadaEm } = assinaturaValida('1', '2026-09-12T10:00:00.000Z');

    expect(() => paraAssinatura({ id, desenho, criadaEm })).toThrow('Assinatura salva inválida.');
  });

  test('lança erro quando um campo tem o tipo errado', () => {
    const assinatura = assinaturaValida('1', '2026-09-12T10:00:00.000Z');

    expect(() => paraAssinatura({ ...assinatura, desenho: { ...assinatura.desenho, tracos: 'M10,20' } })).toThrow(
      'Assinatura salva inválida.',
    );
  });

  test('lança erro quando o dado não é objeto', () => {
    expect(() => paraAssinatura(null)).toThrow(ValidationError);
  });
});
