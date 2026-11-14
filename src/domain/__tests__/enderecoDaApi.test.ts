import { ValidationError } from '../brand';
import { criarEnderecoDaApi } from '../enderecoDaApi';

describe('criarEnderecoDaApi', () => {
  test('aceita http ou https com IP ou nome e porta, sem espaços nem a barra final', () => {
    expect(criarEnderecoDaApi(' http://192.168.0.10:3000/ ')).toBe('http://192.168.0.10:3000');
    expect(criarEnderecoDaApi('https://api.exemplo.com')).toBe('https://api.exemplo.com');
    expect(criarEnderecoDaApi('http://10.0.2.2:3000')).toBe('http://10.0.2.2:3000');
  });

  test.each([
    '192.168.0.10:3000',
    'ftp://192.168.0.10',
    'http://',
    'http://192.168.0.10:3000/documentos',
    'http://192.168.0.10:abc',
    '',
  ])('recusa %p', (texto) => {
    expect(() => criarEnderecoDaApi(texto)).toThrow(ValidationError);
  });
});
