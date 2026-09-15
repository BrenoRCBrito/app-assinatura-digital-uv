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

function obterPosicaoAtual(): Promise<LocationObject | null> {
  return new Promise((resolve, reject) => {
    const limite = setTimeout(() => resolve(null), LIMITE_DO_GPS_MS);
    getCurrentPositionAsync({ accuracy: Accuracy.High }).then(
      (posicao) => {
        clearTimeout(limite);
        resolve(posicao);
      },
      (error: unknown) => {
        clearTimeout(limite);
        reject(error);
      },
    );
  });
}

async function obterCidade(posicao: LocationObject): Promise<City | null> {
  try {
    const [endereco] = await reverseGeocodeAsync(posicao.coords);
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
    const posicao = (await obterPosicaoAtual()) ?? (await getLastKnownPositionAsync());
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
