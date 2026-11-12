import type { NetworkInterfaceInfo } from 'node:os';

export const PORTA_PADRAO = 3000;
const TAMANHO_MINIMO_DO_SEGREDO = 32;
const MAIOR_PORTA = 65535;

export type Configuracao = Readonly<{ segredo: string; porta: number }>;

export function lerConfiguracao(ambiente: NodeJS.ProcessEnv): Configuracao {
  const segredo = ambiente.ASSINAAQUI_HMAC_SECRET;
  if (segredo === undefined || segredo.length < TAMANHO_MINIMO_DO_SEGREDO) {
    throw new Error(
      `Defina ASSINAAQUI_HMAC_SECRET, com ${TAMANHO_MINIMO_DO_SEGREDO} caracteres ou mais, no .env.local do contêiner.`,
    );
  }
  const porta = ambiente.PORT === undefined || ambiente.PORT === '' ? PORTA_PADRAO : Number(ambiente.PORT);
  if (!Number.isInteger(porta) || porta < 1 || porta > MAIOR_PORTA) {
    throw new Error(`Porta inválida: ${ambiente.PORT}`);
  }
  return { segredo, porta };
}

export function enderecosNaRede(
  interfaces: NodeJS.Dict<NetworkInterfaceInfo[]>,
  porta: number,
): readonly string[] {
  return Object.values(interfaces)
    .flatMap((lista) => lista ?? [])
    .filter((info) => info.family === 'IPv4' && !info.internal)
    .map((info) => `http://${info.address}:${porta}`);
}
