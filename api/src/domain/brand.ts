export type Brand<Base, Name extends string> = Base & { readonly __brand: Name };

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
