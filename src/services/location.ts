import {
  Accuracy,
  getCurrentPositionAsync,
  getForegroundPermissionsAsync,
  getLastKnownPositionAsync,
  requestForegroundPermissionsAsync,
  reverseGeocodeAsync,
  type LocationGeocodedAddress,
  type LocationObject,
} from 'expo-location';

import {
  createCity,
  createLatitude,
  createLongitude,
  type Coordinates,
  type LocalAssinatura,
} from '../domain/documento';
import { montarEndereco, type Endereco } from '../domain/endereco';

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

type CidadeEEndereco = Pick<LocalAssinatura, 'cidade' | 'endereco'>;

const SEM_ENDERECO: CidadeEEndereco = { cidade: null, endereco: null };

function paraEndereco(consulta: LocationGeocodedAddress | undefined): CidadeEEndereco {
  if (consulta === undefined) {
    return SEM_ENDERECO;
  }
  const cidade = consulta.city?.trim();
  return {
    cidade: cidade ? createCity(cidade) : null,
    endereco: montarEndereco({
      rua: consulta.street,
      numero: consulta.streetNumber,
      bairro: consulta.district,
      cidade: consulta.city ?? consulta.subregion,
      estado: consulta.region,
      cep: consulta.postalCode,
      enderecoPronto: consulta.formattedAddress ?? null,
    }),
  };
}

// Uma consulta só traz a cidade e o endereço aproximado; o limite de tempo não deixa a assinatura esperar.
async function consultarEndereco(coordenadas: Readonly<{ latitude: number; longitude: number }>): Promise<CidadeEEndereco> {
  try {
    const [consulta] =
      (await comLimiteDeTempo(
        reverseGeocodeAsync({ latitude: coordenadas.latitude, longitude: coordenadas.longitude }),
        LIMITE_DA_CIDADE_MS,
      )) ?? [];
    return paraEndereco(consulta);
  } catch (error) {
    console.error('Falha ao buscar o endereço da assinatura:', error);
    return SEM_ENDERECO;
  }
}

// Para documentos assinados antes de o endereço ser gravado. Não pede permissão: no Android a consulta exige a
// localização liberada, e quem assinou já liberou; sem ela, a tela mostra só as coordenadas.
export async function consultarEnderecoDoLocal(coordenadas: Coordinates): Promise<Endereco | null> {
  try {
    const permissao = await getForegroundPermissionsAsync();
    if (!permissao.granted) {
      return null;
    }
    return (await consultarEndereco(coordenadas)).endereco;
  } catch (error) {
    console.error('Falha ao consultar o endereço do documento:', error);
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
        ...(await consultarEndereco(posicao.coords)),
      },
    };
  } catch (error) {
    console.error('Falha ao obter o local da assinatura:', error);
    return { tipo: 'indisponivel' };
  }
}
