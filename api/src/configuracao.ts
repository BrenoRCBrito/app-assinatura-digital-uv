import type { NetworkInterfaceInfo } from 'node:os';

export const PORTA_PADRAO = 3000;
const TAMANHO_MINIMO_DO_SEGREDO = 32;
const MAIOR_PORTA = 65535;

export type ContaDeServico = Readonly<{ projectId: string; clientEmail: string; privateKey: string }>;

export type Configuracao = Readonly<{
  segredo: string;
  porta: number;
  enderecoNaRede: string | null;
  // Com conta de serviço os registros vão para o Firestore; sem, para o SQLite em api/dados.
  contaDeServico: ContaDeServico | null;
}>;

const CONTA_DE_SERVICO_INVALIDA =
  'FIREBASE_SERVICE_ACCOUNT inválida: cole o conteúdo inteiro do JSON baixado em Configurações do projeto > Contas de serviço.';

// Nas mensagens de erro nunca entra o conteúdo da variável: ele traz a chave privada.
function lerContaDeServico(json: string | undefined): ContaDeServico | null {
  if (json === undefined || json.trim() === '') {
    return null;
  }
  let dado: unknown;
  try {
    dado = JSON.parse(json);
  } catch {
    throw new Error(CONTA_DE_SERVICO_INVALIDA);
  }
  if (typeof dado !== 'object' || dado === null || Array.isArray(dado)) {
    throw new Error(CONTA_DE_SERVICO_INVALIDA);
  }
  const { project_id: projectId, client_email: clientEmail, private_key: privateKey } = dado as Record<string, unknown>;
  if (typeof projectId !== 'string' || typeof clientEmail !== 'string' || typeof privateKey !== 'string') {
    throw new Error(CONTA_DE_SERVICO_INVALIDA);
  }
  // Painéis de hospedagem às vezes guardam o \n da chave como texto: volta a ser quebra de linha.
  return { projectId, clientEmail, privateKey: privateKey.replaceAll('\\n', '\n') };
}

export function lerConfiguracao(ambiente: NodeJS.ProcessEnv): Configuracao {
  const segredo = ambiente.ASSINAAQUI_HMAC_SECRET;
  if (segredo === undefined || segredo.length < TAMANHO_MINIMO_DO_SEGREDO) {
    throw new Error(
      `Defina ASSINAAQUI_HMAC_SECRET, com ${TAMANHO_MINIMO_DO_SEGREDO} caracteres ou mais, no .env.local ou nas variáveis de ambiente do Render.`,
    );
  }
  const porta = ambiente.PORT === undefined || ambiente.PORT === '' ? PORTA_PADRAO : Number(ambiente.PORT);
  if (!Number.isInteger(porta) || porta < 1 || porta > MAIOR_PORTA) {
    throw new Error(`Porta inválida: ${ambiente.PORT}`);
  }
  const enderecoNaRede = ambiente.ASSINAAQUI_ENDERECO_NA_REDE?.trim() ?? '';
  return {
    segredo,
    porta,
    enderecoNaRede: enderecoNaRede === '' ? null : enderecoNaRede,
    contaDeServico: lerContaDeServico(ambiente.FIREBASE_SERVICE_ACCOUNT),
  };
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
