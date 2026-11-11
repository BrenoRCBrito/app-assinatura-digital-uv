import { lerConfiguracaoDoFirebase } from '../firebaseConfig';

jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: {} } } }));

const extra = jest.requireMock<{ default: { expoConfig: { extra: Record<string, unknown> } } }>('expo-constants')
  .default.expoConfig.extra;
const COMPLETA = {
  apiKey: 'chave',
  authDomain: 'projeto.firebaseapp.com',
  projectId: 'projeto',
  messagingSenderId: '123456',
  appId: '1:123456:web:abc',
};

describe('lerConfiguracaoDoFirebase', () => {
  afterEach(() => {
    delete extra.firebase;
  });

  test('devolve a configuração do app', () => {
    extra.firebase = COMPLETA;

    expect(lerConfiguracaoDoFirebase()).toEqual(COMPLETA);
  });

  test('o bucket do Storage é opcional, mas entra quando existe', () => {
    extra.firebase = { ...COMPLETA, storageBucket: 'projeto.firebasestorage.app' };

    expect(lerConfiguracaoDoFirebase()).toEqual({ ...COMPLETA, storageBucket: 'projeto.firebasestorage.app' });
  });

  test('bucket vazio é ignorado', () => {
    extra.firebase = { ...COMPLETA, storageBucket: '  ' };

    expect(lerConfiguracaoDoFirebase()).toEqual(COMPLETA);
  });

  test('sem configuração, recusa e explica onde definir', () => {
    expect(() => lerConfiguracaoDoFirebase()).toThrow('Configuração do Firebase ausente: defina as variáveis FIREBASE_*');
  });

  test.each(Object.keys(COMPLETA))('sem %s, recusa e diz qual campo falta', (campo) => {
    extra.firebase = { ...COMPLETA, [campo]: undefined };

    expect(() => lerConfiguracaoDoFirebase()).toThrow(`(falta ${campo})`);
  });

  test('campo em branco ou que não é texto também é recusado', () => {
    extra.firebase = { ...COMPLETA, apiKey: '   ' };
    expect(() => lerConfiguracaoDoFirebase()).toThrow('(falta apiKey)');

    extra.firebase = { ...COMPLETA, appId: 42 };
    expect(() => lerConfiguracaoDoFirebase()).toThrow('(falta appId)');
  });

  test('firebase configurado como algo que não é objeto é recusado', () => {
    extra.firebase = 'texto';

    expect(() => lerConfiguracaoDoFirebase()).toThrow('Configuração do Firebase ausente');
  });
});
