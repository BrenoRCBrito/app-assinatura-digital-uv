import { ValidationError, type Brand } from './brand';
import { createIsoDateTime, type IsoDateTime } from './dateTime';
import { paraDesenho, type Desenho } from './desenho';
import { lerObjeto, lerTexto } from './leitura';
import { criarUsuarioId, type UsuarioId } from './usuario';

export type AssinaturaId = Brand<string, 'AssinaturaId'>;
export type NomeAssinatura = Brand<string, 'NomeAssinatura'>;

export type Assinatura = Readonly<{
  id: AssinaturaId;
  usuarioId: UsuarioId;
  nome: NomeAssinatura;
  desenho: Desenho;
  criadaEm: IsoDateTime;
}>;

const ASSINATURA_ID = /^\d+$/;
const TAMANHO_MAXIMO_DO_NOME = 40;
const ASSINATURA_INVALIDA = 'Assinatura salva inválida.';

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

export function paraAssinatura(dado: unknown): Assinatura {
  const assinatura = lerObjeto(dado, ASSINATURA_INVALIDA);

  return {
    id: criarAssinaturaId(lerTexto('id' in assinatura ? assinatura.id : undefined, ASSINATURA_INVALIDA)),
    usuarioId: criarUsuarioId(
      lerTexto('usuarioId' in assinatura ? assinatura.usuarioId : undefined, ASSINATURA_INVALIDA),
    ),
    nome: criarNomeAssinatura(lerTexto('nome' in assinatura ? assinatura.nome : undefined, ASSINATURA_INVALIDA)),
    desenho: paraDesenho('desenho' in assinatura ? assinatura.desenho : undefined, ASSINATURA_INVALIDA),
    criadaEm: createIsoDateTime(
      lerTexto('criadaEm' in assinatura ? assinatura.criadaEm : undefined, ASSINATURA_INVALIDA),
    ),
  };
}
