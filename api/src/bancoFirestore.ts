import { GrpcStatus, type Firestore } from 'firebase-admin/firestore';

import type { Banco } from './banco';

// As regras do Firestore não liberam esta coleção para o app: só a API, com a conta de serviço, lê e grava.
export const COLECAO_DOS_REGISTROS = 'registrosDaApi';

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : '';
}

export function abrirBancoFirestore(firestore: Firestore, colecao = COLECAO_DOS_REGISTROS): Banco {
  const registros = firestore.collection(colecao);

  return {
    async inserir({ codigo, campos, carimbo, criadoEm }) {
      try {
        // create() falha se o documento já existe: é o INSERT OR IGNORE do SQLite.
        await registros.doc(codigo).create({ campos, carimbo, criadoEm });
        return true;
      } catch (error) {
        if ((error as { code?: unknown })?.code === GrpcStatus.ALREADY_EXISTS) {
          return false;
        }
        throw error;
      }
    },
    async buscar(codigo) {
      const documento = await registros.doc(codigo).get();
      if (!documento.exists) {
        return null;
      }
      // Campo mexido no console vira texto vazio: o carimbo deixa de conferir e a API responde "adulterado".
      const dados = documento.data() ?? {};
      return { codigo, campos: texto(dados.campos), carimbo: texto(dados.carimbo), criadoEm: texto(dados.criadoEm) };
    },
    async fechar() {
      await firestore.terminate();
    },
  };
}
