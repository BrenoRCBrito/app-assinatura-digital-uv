import type { Persistence } from 'firebase/auth';

// O pacote só publica este tipo na versão de React Native, que o TypeScript não escolhe sozinho.
declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: {
    getItem(chave: string): Promise<string | null>;
    setItem(chave: string, valor: string): Promise<void>;
    removeItem(chave: string): Promise<void>;
  }): Persistence;
}
