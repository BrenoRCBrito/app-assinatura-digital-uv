import Constants from 'expo-constants';
import type { FirebaseOptions } from 'firebase/app';

const AUSENTE = 'Configuração do Firebase ausente: defina as variáveis FIREBASE_* no .env.local.';

function campo(origem: Readonly<Record<string, unknown>>, nome: string): string {
  const valor = origem[nome];
  if (typeof valor !== 'string' || valor.trim() === '') {
    throw new Error(`${AUSENTE} (falta ${nome})`);
  }
  return valor;
}

export function lerConfiguracaoDoFirebase(): FirebaseOptions {
  const configurada: unknown = Constants.expoConfig?.extra?.firebase;
  if (typeof configurada !== 'object' || configurada === null) {
    throw new Error(AUSENTE);
  }
  const origem = configurada as Readonly<Record<string, unknown>>;
  const storageBucket = origem.storageBucket;
  const databaseURL = origem.databaseURL;

  return {
    apiKey: campo(origem, 'apiKey'),
    authDomain: campo(origem, 'authDomain'),
    projectId: campo(origem, 'projectId'),
    messagingSenderId: campo(origem, 'messagingSenderId'),
    appId: campo(origem, 'appId'),
    // O bucket só existe depois de ativar o Storage, então é opcional até lá.
    ...(typeof storageBucket === 'string' && storageBucket.trim() !== '' ? { storageBucket } : {}),
    ...(typeof databaseURL === 'string' && databaseURL.trim() !== '' ? { databaseURL } : {}),
  };
}
