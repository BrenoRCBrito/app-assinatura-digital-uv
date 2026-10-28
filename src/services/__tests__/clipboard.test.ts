import { setStringAsync } from 'expo-clipboard';

import { copiarTexto } from '../clipboard';

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));

describe('copiarTexto', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('manda o texto para a área de transferência', async () => {
    jest.mocked(setStringAsync).mockResolvedValue(true);

    await copiarTexto('AA1;id=1#carimbo');

    expect(setStringAsync).toHaveBeenCalledWith('AA1;id=1#carimbo');
  });

  test('a falha ao copiar chega a quem chamou', async () => {
    jest.mocked(setStringAsync).mockRejectedValue(new Error('Sem acesso'));

    await expect(copiarTexto('x')).rejects.toThrow('Sem acesso');
  });
});
