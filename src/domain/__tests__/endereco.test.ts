import { createEndereco, montarEndereco, TAMANHO_MAXIMO_DO_ENDERECO } from '../endereco';

const VAZIO = {
  rua: null,
  numero: null,
  bairro: null,
  cidade: null,
  estado: null,
  cep: null,
  enderecoPronto: null,
};

describe('montarEndereco', () => {
  test('monta o endereço completo no formato brasileiro', () => {
    expect(
      montarEndereco({
        ...VAZIO,
        rua: 'Rua das Flores',
        numero: '123',
        bairro: 'Centro',
        cidade: 'Vassouras',
        estado: 'RJ',
        cep: '27700-000',
      }),
    ).toBe('Rua das Flores, 123 - Centro, Vassouras - RJ, 27700-000');
  });

  test('pula as partes que a consulta não trouxe', () => {
    expect(montarEndereco({ ...VAZIO, rua: 'Rua das Flores', cidade: 'Vassouras', estado: 'RJ' })).toBe(
      'Rua das Flores, Vassouras - RJ',
    );
    expect(montarEndereco({ ...VAZIO, bairro: 'Centro', cidade: 'Vassouras' })).toBe('Centro, Vassouras');
    expect(montarEndereco({ ...VAZIO, numero: '123', cidade: 'Vassouras' })).toBe('Vassouras');
  });

  test('ignora espaços e partes em branco', () => {
    expect(montarEndereco({ ...VAZIO, rua: '  Rua A ', numero: ' ', cidade: ' Vassouras ' })).toBe('Rua A, Vassouras');
  });

  test('sem as partes, usa o endereço pronto que o Android às vezes traz', () => {
    expect(montarEndereco({ ...VAZIO, enderecoPronto: ' R. das Flores, 123 - Centro, Vassouras - RJ ' })).toBe(
      'R. das Flores, 123 - Centro, Vassouras - RJ',
    );
  });

  test('sem nada, não há endereço', () => {
    expect(montarEndereco(VAZIO)).toBeNull();
  });

  test('corta um endereço longo demais', () => {
    const endereco = montarEndereco({ ...VAZIO, rua: 'R'.repeat(500), cidade: 'Vassouras' });

    expect(endereco?.length).toBe(TAMANHO_MAXIMO_DO_ENDERECO);
  });
});

describe('createEndereco', () => {
  test('aceita um endereço e tira os espaços das pontas', () => {
    expect(createEndereco('  Rua A, Vassouras ')).toBe('Rua A, Vassouras');
  });

  test.each(['', '   ', 'x'.repeat(TAMANHO_MAXIMO_DO_ENDERECO + 1)])('recusa o endereço inválido %p', (texto) => {
    expect(() => createEndereco(texto)).toThrow('Endereço inválido.');
  });
});
