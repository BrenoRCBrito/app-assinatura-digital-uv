import { carimbarComOSegredoDoApp } from '../carimbo';
import { carimbar } from '../hmac';

jest.mock('expo-crypto', () => require('../testing/expoCryptoComNode'));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: {} } } }));

const SEGREDO = 'segredo-de-teste-com-mais-de-32-caracteres';
const extra = jest.requireMock<{ default: { expoConfig: { extra: Record<string, unknown> } } }>('expo-constants')
  .default.expoConfig.extra;

describe('carimbarComOSegredoDoApp', () => {
  afterEach(() => {
    delete extra.hmacSecret;
  });

  test('carimba com o segredo configurado no app', async () => {
    extra.hmacSecret = SEGREDO;

    await expect(carimbarComOSegredoDoApp('mensagem')).resolves.toBe(await carimbar(SEGREDO, 'mensagem'));
    await expect(carimbarComOSegredoDoApp('mensagem')).resolves.not.toBe(await carimbar(`${SEGREDO}x`, 'mensagem'));
  });

  test('sem segredo, recusa carimbar', async () => {
    await expect(carimbarComOSegredoDoApp('mensagem')).rejects.toThrow('Segredo do carimbo ausente');
  });

  test('segredo curto demais também é recusado', async () => {
    extra.hmacSecret = 'curto';

    await expect(carimbarComOSegredoDoApp('mensagem')).rejects.toThrow('Segredo do carimbo ausente');
  });
});
