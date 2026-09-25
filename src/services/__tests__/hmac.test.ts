/// <reference types="node" />
import { carimbar, hmacSha256, paraBase64Url, resumirSha256 } from '../hmac';

jest.mock('expo-crypto', () => require('../testing/expoCryptoComNode'));

function bytes(hex: string): Uint8Array {
  return new Uint8Array(Buffer.from(hex, 'hex'));
}

function texto(conteudo: string): Uint8Array {
  return new Uint8Array(Buffer.from(conteudo, 'utf8'));
}

function repetido(byte: number, quantidade: number): Uint8Array {
  return new Uint8Array(quantidade).fill(byte);
}

function hex(dados: Uint8Array): string {
  return Buffer.from(dados).toString('hex');
}

describe('hmacSha256', () => {
  test.each([
    ['caso 1', repetido(0x0b, 20), texto('Hi There'), 'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7'],
    [
      'caso 2',
      texto('Jefe'),
      texto('what do ya want for nothing?'),
      '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
    ],
    [
      'caso 4',
      bytes('0102030405060708090a0b0c0d0e0f10111213141516171819'),
      repetido(0xcd, 50),
      '82558a389a443c0ea4cc819899f2083a85f0faa3e578f8077a2e3ff46729665b',
    ],
    [
      'caso 6, chave maior que o bloco',
      repetido(0xaa, 131),
      texto('Test Using Larger Than Block-Size Key - Hash Key First'),
      '60e431591ee0b67f0d8a26aacbf5b77f8e0bc6213728c5140546040f0ee37f54',
    ],
  ])('confere com o vetor da RFC 4231, %s', async (_caso, chave, mensagem, esperado) => {
    expect(hex(await hmacSha256(chave, mensagem))).toBe(esperado);
  });
});

describe('paraBase64Url', () => {
  test.each([
    ['', ''],
    ['f', 'Zg'],
    ['fo', 'Zm8'],
    ['foo', 'Zm9v'],
    ['foob', 'Zm9vYg'],
    ['fooba', 'Zm9vYmE'],
    ['foobar', 'Zm9vYmFy'],
  ])('codifica %j sem preenchimento', (entrada, esperado) => {
    expect(paraBase64Url(texto(entrada))).toBe(esperado);
  });

  test('usa - e _ no lugar de + e /', () => {
    expect(paraBase64Url(bytes('fbff'))).toBe('-_8');
  });
});

describe('carimbar e resumirSha256', () => {
  test('o carimbo é o HMAC do texto em base64url', async () => {
    await expect(carimbar('Jefe', 'what do ya want for nothing?')).resolves.toBe(
      'W9zBRr9gdU5qBCQmCJV1x1oAPwidJzmDnexYuWTsOEM',
    );
  });

  test('o resumo é o SHA-256 em hexadecimal', async () => {
    await expect(resumirSha256('abc')).resolves.toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});
