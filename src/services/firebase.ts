import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth, type Auth } from 'firebase/auth';
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
