export type Brand<Base, Name extends string> = Base & { readonly __brand: Name };

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

const ID_SEGURO = /^[A-Za-z0-9_-]{1,64}$/;

export function validarId(texto: string, mensagem: string): string {
  if (!ID_SEGURO.test(texto)) {
    throw new ValidationError(`${mensagem}: ${texto}`);
  }
  return texto;
}
