import {
  Accuracy,
  getCurrentPositionAsync,
  getLastKnownPositionAsync,
  requestForegroundPermissionsAsync,
  reverseGeocodeAsync,
  type LocationObject,
} from 'expo-location';

import { createCity, createLatitude, createLongitude, type City, type LocalAssinatura } from '../domain/documento';

export type ResultadoLocalAssinatura =
  | Readonly<{ tipo: 'obtido'; local: LocalAssinatura }>
  | Readonly<{ tipo: 'semPermissao' }>
  | Readonly<{ tipo: 'indisponivel' }>;

const LIMITE_DO_GPS_MS = 15000;
const IDADE_MAXIMA_DA_ULTIMA_POSICAO_MS = 300000;
const LIMITE_DA_CIDADE_MS = 5000;

function comLimiteDeTempo<T>(promessa: Promise<T>, limiteMs: number): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const limite = setTimeout(() => resolve(null), limiteMs);
    promessa.then(
      (valor) => {
        clearTimeout(limite);
        resolve(valor);
      },
      (error: unknown) => {
        clearTimeout(limite);
        reject(error);
      },
    );
  });
}

function obterPosicaoAtual(): Promise<LocationObject | null> {
  return comLimiteDeTempo(getCurrentPositionAsync({ accuracy: Accuracy.High }), LIMITE_DO_GPS_MS);
}

function obterUltimaPosicao(): Promise<LocationObject | null> {
  return getLastKnownPositionAsync({ maxAge: IDADE_MAXIMA_DA_ULTIMA_POSICAO_MS });
}

async function obterCidade(posicao: LocationObject): Promise<City | null> {
  try {
    const [endereco] = (await comLimiteDeTempo(reverseGeocodeAsync(posicao.coords), LIMITE_DA_CIDADE_MS)) ?? [];
    const cidade = endereco?.city?.trim();
    return cidade ? createCity(cidade) : null;
  } catch (error) {
    console.error('Falha ao buscar a cidade da assinatura:', error);
    return null;
  }
}

export async function obterLocalAssinatura(): Promise<ResultadoLocalAssinatura> {
  try {
    const permissao = await requestForegroundPermissionsAsync();
    if (!permissao.granted) {
      return { tipo: 'semPermissao' };
    }
    const posicao = (await obterPosicaoAtual()) ?? (await obterUltimaPosicao());
    if (posicao === null) {
      return { tipo: 'indisponivel' };
    }
    return {
      tipo: 'obtido',
      local: {
        coordenadas: {
          latitude: createLatitude(posicao.coords.latitude),
          longitude: createLongitude(posicao.coords.longitude),
        },
        cidade: await obterCidade(posicao),
      },
    };
  } catch (error) {
    console.error('Falha ao obter o local da assinatura:', error);
    return { tipo: 'indisponivel' };
  }
}
