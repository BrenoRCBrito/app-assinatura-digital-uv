import { criarCpf, criarTelefone, criarUsuarioId, mascararCpfDigitado, mascararTelefoneDigitado } from '../usuario';

describe('criarUsuarioId', () => {
  test('aceita o id numérico antigo, um UUID e o uid do Firebase', () => {
    expect(criarUsuarioId('1757680000000')).toBe('1757680000000');
    expect(criarUsuarioId('3f2b8c1e-9a4d-4e7b-b1c2-5d6e7f8a9b0c')).toBe('3f2b8c1e-9a4d-4e7b-b1c2-5d6e7f8a9b0c');
    expect(criarUsuarioId('Xq3Zk9LmP2vR8sTnW1yBcD4eFgH7')).toBe('Xq3Zk9LmP2vR8sTnW1yBcD4eFgH7');
  });

  test.each(['', '../abc', 'a/b', 'a;b', 'a#b', 'a b'])('recusa o id inseguro "%s"', (texto) => {
    expect(() => criarUsuarioId(texto)).toThrow(`Id de usuário inválido: ${texto}`);
  });
});

describe('mascararCpfDigitado', () => {
  test.each([
    ['', ''],
    ['1', '1'],
    ['123', '123'],
    ['1234', '123.4'],
    ['123456', '123.456'],
    ['1234567', '123.456.7'],
    ['123456789', '123.456.789'],
    ['1234567890', '123.456.789-0'],
    ['12345678901', '123.456.789-01'],
  ])('formata %p como %p enquanto a pessoa digita', (digitado, esperado) => {
    expect(mascararCpfDigitado(digitado)).toBe(esperado);
  });

  test('ignora o que não é número, inclusive a própria máscara, e para nos 11 dígitos', () => {
    expect(mascararCpfDigitado('111.444.777-35')).toBe('111.444.777-35');
    expect(mascararCpfDigitado('111.444.777-359')).toBe('111.444.777-35');
    expect(mascararCpfDigitado('abc 111x444')).toBe('111.444');
  });

  test('apagar o último número nunca deixa um separador sobrando no fim', () => {
    expect(mascararCpfDigitado('123.')).toBe('123');
    expect(mascararCpfDigitado('123.456.789-')).toBe('123.456.789');
  });

  test('o CPF mascarado continua aceito na hora de salvar', () => {
    expect(criarCpf(mascararCpfDigitado('11144477735'))).toBe('11144477735');
  });
});

describe('mascararTelefoneDigitado', () => {
  test.each([
    ['', ''],
    ['2', '(2'],
    ['24', '(24'],
    ['249', '(24) 9'],
    ['249999', '(24) 9999'],
    ['2499999', '(24) 9999-9'],
    ['2433334444', '(24) 3333-4444'],
    ['24999998888', '(24) 99999-8888'],
  ])('formata %p como %p enquanto a pessoa digita', (digitado, esperado) => {
    expect(mascararTelefoneDigitado(digitado)).toBe(esperado);
  });

  test('ignora o que não é número, inclusive a própria máscara, e para nos 11 dígitos', () => {
    expect(mascararTelefoneDigitado('(24) 99999-8888')).toBe('(24) 99999-8888');
    expect(mascararTelefoneDigitado('(24) 99999-88887')).toBe('(24) 99999-8888');
    expect(mascararTelefoneDigitado('+55 24')).toBe('(55) 24');
  });

  test('apagar o último número nunca deixa um separador sobrando no fim', () => {
    expect(mascararTelefoneDigitado('(')).toBe('');
    expect(mascararTelefoneDigitado('(24) ')).toBe('(24');
    expect(mascararTelefoneDigitado('(24) 9999-')).toBe('(24) 9999');
  });

  test('o telefone mascarado continua aceito na hora de salvar', () => {
    expect(criarTelefone(mascararTelefoneDigitado('24999998888'))).toBe('24999998888');
    expect(criarTelefone(mascararTelefoneDigitado('2433334444'))).toBe('2433334444');
  });
});
