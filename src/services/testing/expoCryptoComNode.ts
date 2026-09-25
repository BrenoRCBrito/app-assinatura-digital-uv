/// <reference types="node" />
import { createHash } from 'node:crypto';

export const CryptoDigestAlgorithm = { SHA256: 'SHA-256' } as const;

export async function digest(_algoritmo: string, dados: Uint8Array): Promise<ArrayBuffer> {
  return new Uint8Array(createHash('sha256').update(dados).digest()).buffer;
}

export async function digestStringAsync(_algoritmo: string, texto: string): Promise<string> {
  return createHash('sha256').update(texto, 'utf8').digest('hex');
}
