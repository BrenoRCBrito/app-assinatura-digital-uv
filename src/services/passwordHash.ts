import * as Crypto from 'expo-crypto';

export async function hashSenha(senha: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, senha);
}
