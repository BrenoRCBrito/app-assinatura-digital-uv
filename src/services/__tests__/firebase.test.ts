import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

type ModuloDoFirebase = typeof import('../firebase');

jest.mock('firebase/app', () => ({ getApp: jest.fn(), getApps: jest.fn(), initializeApp: jest.fn() }));
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  getReactNativePersistence: jest.fn(),
  initializeAuth: jest.fn(),
}));
jest.mock('firebase/firestore', () => ({ getFirestore: jest.fn() }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        firebase: {
          apiKey: 'chave',
          authDomain: 'projeto.firebaseapp.com',
          projectId: 'projeto',
          messagingSenderId: '123456',
          appId: '1:123456:web:abc',
        },
      },
    },
  },
}));

const APP = { name: '[DEFAULT]' };
const AUTH = { nome: 'auth' };
const PERSISTENCIA = { tipo: 'persistencia' };

// Cada teste começa com o módulo "recém aberto", já que ele guarda o Auth criado.
function carregar(): ModuloDoFirebase {
  let modulo: ModuloDoFirebase | undefined;
  jest.isolateModules(() => {
    modulo = require('../firebase');
  });
  if (modulo === undefined) {
    throw new Error('Módulo não carregou.');
  }
  return modulo;
}

describe('firebase', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(getApps).mockReturnValue([]);
    jest.mocked(initializeApp).mockReturnValue(APP as never);
    jest.mocked(getApp).mockReturnValue(APP as never);
    jest.mocked(getReactNativePersistence).mockReturnValue(PERSISTENCIA as never);
    jest.mocked(initializeAuth).mockReturnValue(AUTH as never);
  });

  describe('obterApp', () => {
    test('na primeira vez inicializa o app com a configuração do aplicativo', () => {
      expect(carregar().obterApp()).toBe(APP);

      expect(initializeApp).toHaveBeenCalledWith({
        apiKey: 'chave',
        authDomain: 'projeto.firebaseapp.com',
        projectId: 'projeto',
        messagingSenderId: '123456',
        appId: '1:123456:web:abc',
      });
    });

    test('se o app já existe, reaproveita em vez de inicializar de novo', () => {
      jest.mocked(getApps).mockReturnValue([APP as never]);

      expect(carregar().obterApp()).toBe(APP);

      expect(initializeApp).not.toHaveBeenCalled();
      expect(getApp).toHaveBeenCalledTimes(1);
    });
  });

  describe('obterAuth', () => {
    test('cria o Auth guardando o login no AsyncStorage', () => {
      expect(carregar().obterAuth()).toBe(AUTH);

      expect(getReactNativePersistence).toHaveBeenCalledWith(AsyncStorage);
      expect(initializeAuth).toHaveBeenCalledWith(APP, { persistence: PERSISTENCIA });
    });

    test('chamadas seguintes devolvem o mesmo Auth, sem criar outro', () => {
      const { obterAuth } = carregar();

      expect(obterAuth()).toBe(obterAuth());

      expect(initializeAuth).toHaveBeenCalledTimes(1);
    });

    test('se o Firebase já tinha criado o Auth (Fast Refresh), usa o que existe', () => {
      jest.mocked(initializeAuth).mockImplementation(() => {
        throw Object.assign(new Error('já existe'), { code: 'auth/already-initialized' });
      });
      jest.mocked(getAuth).mockReturnValue(AUTH as never);

      expect(carregar().obterAuth()).toBe(AUTH);

      expect(getAuth).toHaveBeenCalledWith(APP);
    });

    test('qualquer outro erro ao criar o Auth chega a quem chamou', () => {
      jest.mocked(initializeAuth).mockImplementation(() => {
        throw Object.assign(new Error('sem rede'), { code: 'auth/network-request-failed' });
      });

      expect(() => carregar().obterAuth()).toThrow('sem rede');
      expect(getAuth).not.toHaveBeenCalled();
    });
  });

  describe('obterFirestore', () => {
    test('abre o Firestore do app', () => {
      const FIRESTORE = { nome: 'firestore' };
      jest.mocked(getFirestore).mockReturnValue(FIRESTORE as never);

      expect(carregar().obterFirestore()).toBe(FIRESTORE);

      expect(getFirestore).toHaveBeenCalledWith(APP);
    });
  });
});
