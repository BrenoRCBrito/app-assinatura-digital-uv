import { criarUsuarioId } from '../usuario';

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
