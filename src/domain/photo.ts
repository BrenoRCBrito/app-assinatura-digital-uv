import { ValidationError, type Brand } from './brand';
import { createSize, type Size } from './geometry';

export type FileUri = Brand<string, 'FileUri'>;

export type CapturedPhoto = Readonly<{ uri: FileUri; size: Size }>;

// Mesmos padrões da câmera do app: qualidade do JPEG e lado maior de uma foto de 12 MP. Uma foto da galeria
// maior que isso (48 MP, por exemplo) passaria do limite de envio para a nuvem.
export const QUALIDADE_DA_FOTO = 0.6;
export const MAIOR_LADO_DA_FOTO = 4032;

export type ReducaoDaFoto = Readonly<{ width: number }> | Readonly<{ height: number }>;

// Diz em qual lado encolher a foto; o outro acompanha a proporção. Nulo quando ela já cabe.
export function reducaoDaFoto(tamanho: Size): ReducaoDaFoto | null {
  if (Math.max(tamanho.width, tamanho.height) <= MAIOR_LADO_DA_FOTO) {
    return null;
  }
  return tamanho.width >= tamanho.height ? { width: MAIOR_LADO_DA_FOTO } : { height: MAIOR_LADO_DA_FOTO };
}

export function createFileUri(value: string): FileUri {
  if (value.trim() === '') {
    throw new ValidationError('Endereço de arquivo vazio.');
  }
  return value as FileUri;
}

export function createCapturedPhoto(uri: string, width: number, height: number): CapturedPhoto {
  if (width <= 0 || height <= 0) {
    throw new ValidationError('A foto veio sem tamanho.');
  }
  return { uri: createFileUri(uri), size: createSize(width, height) };
}
