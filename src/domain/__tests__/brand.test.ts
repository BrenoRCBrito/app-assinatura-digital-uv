import { ValidationError , validarId } from '../brand';

describe('ValidationError', () => {
  test('guarda a mensagem e é reconhecido como erro de validação', () => {
    const erro = new ValidationError('Dê um nome à assinatura.');

    expect(erro).toBeInstanceOf(Error);
    expect(erro).toBeInstanceOf(ValidationError);
    expect(erro.name).toBe('ValidationError');
    expect(erro.message).toBe('Dê um nome à assinatura.');
  });
});

describe('validarId', () => {
  test('devolve o próprio texto quando é seguro', () => {
    expect(validarId('abc-123_X', 'Id inválido')).toBe('abc-123_X');
  });

  test('recusa texto fora de letras, números, hífen e sublinhado, com a mensagem recebida', () => {
    expect(() => validarId('a/b', 'Id inválido')).toThrow('Id inválido: a/b');
    expect(() => validarId('', 'Id inválido')).toThrow(ValidationError);
  });
});
