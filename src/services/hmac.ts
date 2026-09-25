import * as Crypto from 'expo-crypto';

const TAMANHO_DO_BLOCO = 64;
const PREENCHIMENTO_INTERNO = 0x36;
const PREENCHIMENTO_EXTERNO = 0x5c;
const ALFABETO_BASE64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

async function sha256(dados: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, new Uint8Array(dados)));
}

function juntar(inicio: Uint8Array, fim: Uint8Array): Uint8Array {
  const junto = new Uint8Array(inicio.length + fim.length);
  junto.set(inicio, 0);
  junto.set(fim, inicio.length);
  return junto;
}

export async function hmacSha256(chave: Uint8Array, mensagem: Uint8Array): Promise<Uint8Array> {
  const bloco = new Uint8Array(TAMANHO_DO_BLOCO);
  bloco.set(chave.length > TAMANHO_DO_BLOCO ? await sha256(chave) : chave);
  const interna = bloco.map((byte) => byte ^ PREENCHIMENTO_INTERNO);
  const externa = bloco.map((byte) => byte ^ PREENCHIMENTO_EXTERNO);
  return sha256(juntar(externa, await sha256(juntar(interna, mensagem))));
}

export function paraBase64Url(bytes: Uint8Array): string {
  let saida = '';
  for (let indice = 0; indice < bytes.length; indice += 3) {
    const grupo = (bytes[indice] << 16) | ((bytes[indice + 1] ?? 0) << 8) | (bytes[indice + 2] ?? 0);
    saida += ALFABETO_BASE64URL[(grupo >> 18) & 63] + ALFABETO_BASE64URL[(grupo >> 12) & 63];
    if (indice + 1 < bytes.length) {
      saida += ALFABETO_BASE64URL[(grupo >> 6) & 63];
    }
    if (indice + 2 < bytes.length) {
      saida += ALFABETO_BASE64URL[grupo & 63];
    }
  }
  return saida;
}

export async function carimbar(segredo: string, mensagem: string): Promise<string> {
  const codificador = new TextEncoder();
  return paraBase64Url(await hmacSha256(codificador.encode(segredo), codificador.encode(mensagem)));
}

export function resumirSha256(texto: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, texto);
}
