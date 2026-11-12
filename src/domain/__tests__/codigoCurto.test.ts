import { ValidationError } from '../brand';
import { criarCodigoCurto, formatarCodigoCurto } from '../codigoCurto';

describe('criarCodigoCurto', () => {
  test('aceita o código impresso, com os hífens', () => {
    expect(criarCodigoCurto('7K3F-9QXZ-M2P4')).toBe('7K3F9QXZM2P4');
  });

  test('aceita minúsculas, espaços e quebras de linha', () => {
    expect(criarCodigoCurto(' 7k3f 9qxz\nm2p4 ')).toBe('7K3F9QXZM2P4');
  });

  test('lê O como zero e I ou L como um', () => {
    expect(criarCodigoCurto('7K3F-9QXZ-MOIL')).toBe('7K3F9QXZM011');
  });

  test.each(['7K3F-9QXZ-M2P', '7K3F-9QXZ-M2P45', '7K3F-9QXZ-M2PU', '7K3F_9QXZ_M2P4', ''])('recusa %p', (texto) => {
    expect(() => criarCodigoCurto(texto)).toThrow(ValidationError);
  });
});

describe('formatarCodigoCurto', () => {
  test('separa em três grupos de quatro', () => {
    expect(formatarCodigoCurto(criarCodigoCurto('7K3F9QXZM2P4'))).toBe('7K3F-9QXZ-M2P4');
  });
});
