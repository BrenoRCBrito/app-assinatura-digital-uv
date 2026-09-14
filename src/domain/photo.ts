import { ValidationError, type Brand } from './brand';
import { createSize, type Size } from './geometry';

export type FileUri = Brand<string, 'FileUri'>;

export type CapturedPhoto = Readonly<{ uri: FileUri; size: Size }>;

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
