import { createHmac, timingSafeEqual } from 'node:crypto';

export type Carimbo = Readonly<{
  carimbar: (mensagem: string) => string;
  confere: (mensagem: string, carimbo: string) => boolean;
}>;

export function criarCarimbo(segredo: string): Carimbo {
  const carimbar = (mensagem: string) => createHmac('sha256', segredo).update(mensagem, 'utf8').digest('base64url');

  return {
    carimbar,
    confere(mensagem, carimbo) {
      const esperado = Buffer.from(carimbar(mensagem));
      const recebido = Buffer.from(carimbo);
      return esperado.length === recebido.length && timingSafeEqual(esperado, recebido);
    },
  };
}
