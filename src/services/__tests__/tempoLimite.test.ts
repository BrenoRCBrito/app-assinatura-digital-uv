import { comTempoLimite } from '../tempoLimite';

describe('comTempoLimite', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('devolve o valor quando a promessa termina dentro do prazo', async () => {
    await expect(comTempoLimite(Promise.resolve('ok'), 1000, 'demorou')).resolves.toBe('ok');
  });

  test('repassa o erro da própria promessa', async () => {
    await expect(comTempoLimite(Promise.reject(new Error('recusado')), 1000, 'demorou')).rejects.toThrow('recusado');
  });

  test('falha com a mensagem quando a promessa nunca termina', async () => {
    const resultado = comTempoLimite(new Promise<never>(() => undefined), 1000, 'demorou');
    const esperado = expect(resultado).rejects.toThrow('demorou');

    jest.advanceTimersByTime(1000);

    await esperado;
  });

  test('não deixa relógio pendente quando a promessa termina', async () => {
    await comTempoLimite(Promise.resolve('ok'), 1000, 'demorou');

    expect(jest.getTimerCount()).toBe(0);
  });
});
