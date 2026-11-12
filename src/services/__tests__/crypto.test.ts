import { resumirSha256 } from '../crypto';

jest.mock('expo-crypto', () => require('../testing/expoCryptoComNode'));

describe('resumirSha256', () => {
  test('o resumo é o SHA-256 em hexadecimal', async () => {
    await expect(resumirSha256('abc')).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});
