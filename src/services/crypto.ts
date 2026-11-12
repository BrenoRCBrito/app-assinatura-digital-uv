import * as Crypto from 'expo-crypto';

export function resumirSha256(texto: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, texto);
}
