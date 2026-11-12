import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth, type Auth } from 'firebase/auth';
import { getDatabase, type Database } from 'firebase/database';
import { getFirestore, type Firestore } from 'firebase/firestore';

import { lerConfiguracaoDoFirebase } from './firebaseConfig';

let auth: Auth | null = null;

export function obterApp(): FirebaseApp {
  return getApps().length === 0 ? initializeApp(lerConfiguracaoDoFirebase()) : getApp();
}

// O login precisa sobreviver ao fechar o app, por isso a persistência fica no AsyncStorage.
export function obterAuth(): Auth {
  if (auth !== null) {
    return auth;
  }
  const app = obterApp();
  try {
    auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch (error) {
    // Com o Fast Refresh o módulo recarrega, mas o Firebase já tem o Auth criado.
    if ((error as { code?: string }).code !== 'auth/already-initialized') {
      throw error;
    }
    auth = getAuth(app);
  }
  return auth;
}

export function obterFirestore(): Firestore {
  return getFirestore(obterApp());
}

const SEM_BANCO_DE_ARQUIVOS =
  'Realtime Database não configurado: crie o banco no console e defina FIREBASE_DATABASE_URL no .env.local.';

export function obterBancoDeArquivos(): Database {
  const app = obterApp();
  if (typeof app.options.databaseURL !== 'string' || app.options.databaseURL.trim() === '') {
    throw new Error(SEM_BANCO_DE_ARQUIVOS);
  }
  return getDatabase(app);
}
