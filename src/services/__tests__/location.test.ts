import {
  getCurrentPositionAsync,
  getLastKnownPositionAsync,
  requestForegroundPermissionsAsync,
  reverseGeocodeAsync,
  type LocationObject,
} from 'expo-location';

import { obterLocalAssinatura } from '../location';

jest.mock('expo-location', () => ({
  Accuracy: { High: 4 },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
}));

type Permissao = Awaited<ReturnType<typeof requestForegroundPermissionsAsync>>;
type Endereco = Awaited<ReturnType<typeof reverseGeocodeAsync>>[number];

const POSICAO: LocationObject = {
  coords: {
    latitude: -22.40418,
    longitude: -43.66283,
    altitude: null,
    accuracy: 10,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  },
  timestamp: 0,
};

function permissao(granted: boolean): Permissao {
  return { granted, canAskAgain: true, expires: 'never', status: granted ? 'granted' : 'denied' } as Permissao;
}

function endereco(city: string | null): Endereco {
  return { city } as Endereco;
}

describe('obterLocalAssinatura', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(requestForegroundPermissionsAsync).mockResolvedValue(permissao(true));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('sem permissão, devolve semPermissao sem ligar o GPS', async () => {
    jest.mocked(requestForegroundPermissionsAsync).mockResolvedValue(permissao(false));

    await expect(obterLocalAssinatura()).resolves.toEqual({ tipo: 'semPermissao' });
    expect(getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  test('com permissão, devolve as coordenadas e a cidade', async () => {
    jest.mocked(getCurrentPositionAsync).mockResolvedValue(POSICAO);
    jest.mocked(reverseGeocodeAsync).mockResolvedValue([endereco(' Vassouras ')]);

    await expect(obterLocalAssinatura()).resolves.toEqual({
      tipo: 'obtido',
      local: { coordenadas: { latitude: -22.40418, longitude: -43.66283 }, cidade: 'Vassouras' },
    });
    expect(getCurrentPositionAsync).toHaveBeenCalledWith({ accuracy: 4 });
  });

  test('depois de 15 s sem posição atual, usa a última posição conhecida de até 5 minutos', async () => {
    jest.useFakeTimers();
    jest.mocked(getCurrentPositionAsync).mockReturnValue(new Promise(() => undefined));
    jest.mocked(getLastKnownPositionAsync).mockResolvedValue(POSICAO);
    jest.mocked(reverseGeocodeAsync).mockResolvedValue([endereco(null)]);

    const resultado = obterLocalAssinatura();
    await jest.advanceTimersByTimeAsync(15000);

    await expect(resultado).resolves.toEqual({
      tipo: 'obtido',
      local: { coordenadas: { latitude: -22.40418, longitude: -43.66283 }, cidade: null },
    });
    expect(getLastKnownPositionAsync).toHaveBeenCalledWith({ maxAge: 300000 });
  });

  test('sem posição atual nem última conhecida, devolve indisponivel', async () => {
    jest.useFakeTimers();
    jest.mocked(getCurrentPositionAsync).mockReturnValue(new Promise(() => undefined));
    jest.mocked(getLastKnownPositionAsync).mockResolvedValue(null);

    const resultado = obterLocalAssinatura();
    await jest.advanceTimersByTimeAsync(15000);

    await expect(resultado).resolves.toEqual({ tipo: 'indisponivel' });
  });

  test('quando o GPS falha, devolve indisponivel', async () => {
    const erro = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.mocked(getCurrentPositionAsync).mockRejectedValue(new Error('Serviço de localização desligado'));

    await expect(obterLocalAssinatura()).resolves.toEqual({ tipo: 'indisponivel' });
    expect(getLastKnownPositionAsync).not.toHaveBeenCalled();
    expect(erro).toHaveBeenCalledTimes(1);
    erro.mockRestore();
  });

  test('quando a busca da cidade falha, devolve as coordenadas sem cidade', async () => {
    const erro = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.mocked(getCurrentPositionAsync).mockResolvedValue(POSICAO);
    jest.mocked(reverseGeocodeAsync).mockRejectedValue(new Error('Sem rede'));

    await expect(obterLocalAssinatura()).resolves.toEqual({
      tipo: 'obtido',
      local: { coordenadas: { latitude: -22.40418, longitude: -43.66283 }, cidade: null },
    });
    expect(erro).toHaveBeenCalledTimes(1);
    erro.mockRestore();
  });

  test('quando a busca da cidade não responde em 5 s, devolve as coordenadas sem cidade', async () => {
    jest.useFakeTimers();
    jest.mocked(getCurrentPositionAsync).mockResolvedValue(POSICAO);
    jest.mocked(reverseGeocodeAsync).mockReturnValue(new Promise(() => undefined));

    const resultado = obterLocalAssinatura();
    await jest.advanceTimersByTimeAsync(5000);

    await expect(resultado).resolves.toEqual({
      tipo: 'obtido',
      local: { coordenadas: { latitude: -22.40418, longitude: -43.66283 }, cidade: null },
    });
  });
});
