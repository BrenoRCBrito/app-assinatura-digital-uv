import { ValidationError } from '../brand';

describe('ValidationError', () => {
  test('guarda a mensagem e é reconhecido como erro de validação', () => {
    const erro = new ValidationError('Dê um nome à assinatura.');

    expect(erro).toBeInstanceOf(Error);
    expect(erro).toBeInstanceOf(ValidationError);
    expect(erro.name).toBe('ValidationError');
    expect(erro.message).toBe('Dê um nome à assinatura.');
  });
});
