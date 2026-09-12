import { ValidationError, type Brand } from './brand';
import { createIsoDateTime, type IsoDateTime } from './dateTime';
import { criarDesenho, criarTraco, type Desenho } from './desenho';
import { createSize } from './geometry';

export type AssinaturaId = Brand<string, 'AssinaturaId'>;
export type NomeAssinatura = Brand<string, 'NomeAssinatura'>;

export type Assinatura = Readonly<{
  id: AssinaturaId;
  nome: NomeAssinatura;
  desenho: Desenho;
  criadaEm: IsoDateTime;
}>;

const ASSINATURA_ID = /^\d+$/;
const TAMANHO_MAXIMO_DO_NOME = 40;
const ASSINATURA_SALVA_INVALIDA = 'Assinatura salva inválida.';

export function criarAssinaturaId(texto: string = Date.now().toString()): AssinaturaId {
  if (!ASSINATURA_ID.test(texto)) {
    throw new ValidationError(`Id de assinatura inválido: ${texto}`);
  }
  return texto as AssinaturaId;
}

export function criarNomeAssinatura(texto: string): NomeAssinatura {
  const nome = texto.trim();
  if (nome.length === 0) {
    throw new ValidationError('Dê um nome à assinatura.');
  }
  if (nome.length > TAMANHO_MAXIMO_DO_NOME) {
    throw new ValidationError(`O nome da assinatura tem no máximo ${TAMANHO_MAXIMO_DO_NOME} caracteres.`);
  }
  return nome as NomeAssinatura;
}

export function ordenarAssinaturasMaisNovasPrimeiro(assinaturas: readonly Assinatura[]): readonly Assinatura[] {
  return [...assinaturas].sort((a, b) => {
    if (a.criadaEm === b.criadaEm) {
      return 0;
    }
    return a.criadaEm < b.criadaEm ? 1 : -1;
  });
}

function lerObjeto(valor: unknown): object {
  if (typeof valor !== 'object' || valor === null) {
    throw new ValidationError(ASSINATURA_SALVA_INVALIDA);
  }
  return valor;
}

function lerTexto(valor: unknown): string {
  if (typeof valor !== 'string') {
    throw new ValidationError(ASSINATURA_SALVA_INVALIDA);
  }
  return valor;
}

function lerNumero(valor: unknown): number {
  if (typeof valor !== 'number') {
    throw new ValidationError(ASSINATURA_SALVA_INVALIDA);
  }
  return valor;
}

export function paraAssinatura(dado: unknown): Assinatura {
  const assinatura = lerObjeto(dado);
  const desenho = lerObjeto('desenho' in assinatura ? assinatura.desenho : undefined);
  const quadro = lerObjeto('quadro' in desenho ? desenho.quadro : undefined);
  const tracos = 'tracos' in desenho ? desenho.tracos : undefined;
  if (!Array.isArray(tracos)) {
    throw new ValidationError(ASSINATURA_SALVA_INVALIDA);
  }

  return {
    id: criarAssinaturaId(lerTexto('id' in assinatura ? assinatura.id : undefined)),
    nome: criarNomeAssinatura(lerTexto('nome' in assinatura ? assinatura.nome : undefined)),
    desenho: criarDesenho(
      tracos.map((traco) => criarTraco(lerTexto(traco))),
      createSize(
        lerNumero('width' in quadro ? quadro.width : undefined),
        lerNumero('height' in quadro ? quadro.height : undefined),
      ),
    ),
    criadaEm: createIsoDateTime(lerTexto('criadaEm' in assinatura ? assinatura.criadaEm : undefined)),
  };
}
