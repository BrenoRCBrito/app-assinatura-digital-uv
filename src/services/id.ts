import { randomUUID } from 'expo-crypto';

export function gerarId(): string {
  return randomUUID();
}
