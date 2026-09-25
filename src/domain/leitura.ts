import { ValidationError } from './brand';

export function lerObjeto(valor: unknown, mensagem: string): object {
  if (typeof valor !== 'object' || valor === null) {
    throw new ValidationError(mensagem);
  }
  return valor;
}

export function lerTexto(valor: unknown, mensagem: string): string {
  if (typeof valor !== 'string') {
    throw new ValidationError(mensagem);
  }
  return valor;
}

export function lerNumero(valor: unknown, mensagem: string): number {
  if (typeof valor !== 'number') {
    throw new ValidationError(mensagem);
  }
  return valor;
}

export function lerLista(valor: unknown, mensagem: string): readonly unknown[] {
  if (!Array.isArray(valor)) {
    throw new ValidationError(mensagem);
  }
  return valor;
}

export function lerTextoOuNulo(valor: unknown, mensagem: string): string | null {
  if (valor === null || valor === undefined) {
    return null;
  }
  return lerTexto(valor, mensagem);
}
