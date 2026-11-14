import { ValidationError, type Brand } from './brand';

export type EnderecoDaApi = Brand<string, 'EnderecoDaApi'>;

const ENDERECO = /^https?:\/\/[^\s/:]+(:\d{1,5})?$/;

export function criarEnderecoDaApi(texto: string): EnderecoDaApi {
  const endereco = texto.trim().replace(/\/+$/, '');
  if (!ENDERECO.test(endereco)) {
    throw new ValidationError('Digite o endereço completo, como http://192.168.0.10:3000.');
  }
  return endereco as EnderecoDaApi;
}
