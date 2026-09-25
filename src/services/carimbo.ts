import Constants from 'expo-constants';

import type { Carimbar } from '../domain/codigoDeAutenticidade';
import { carimbar } from './hmac';

const TAMANHO_MINIMO_DO_SEGREDO = 32;

export function lerSegredoDoCarimbo(): string {
  const segredo: unknown = Constants.expoConfig?.extra?.hmacSecret;
  if (typeof segredo !== 'string' || segredo.length < TAMANHO_MINIMO_DO_SEGREDO) {
    throw new Error('Segredo do carimbo ausente ou curto: defina ASSINAAQUI_HMAC_SECRET no .env.local.');
  }
  return segredo;
}

export const carimbarComOSegredoDoApp: Carimbar = async (mensagem) => carimbar(lerSegredoDoCarimbo(), mensagem);
