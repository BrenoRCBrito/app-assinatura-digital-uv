import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  ordenarDocumentosMaisNovosPrimeiro,
  paraDocumentoAssinado,
  type DocumentoAssinado,
} from '../../domain/documento';
import type { DocumentoAssinadoRepository } from '../repositories';

export const DOCUMENTOS_STORAGE_KEY = '@assinaaqui/documentos';

async function lerDocumentos(): Promise<readonly DocumentoAssinado[]> {
  const salvo = await AsyncStorage.getItem(DOCUMENTOS_STORAGE_KEY);
  if (salvo === null) {
    return [];
  }
  const dados: unknown = JSON.parse(salvo);
  if (!Array.isArray(dados)) {
    throw new Error('A lista de documentos salva está corrompida.');
  }
  return dados.map(paraDocumentoAssinado);
}

async function gravarDocumentos(documentos: readonly DocumentoAssinado[]): Promise<void> {
  await AsyncStorage.setItem(DOCUMENTOS_STORAGE_KEY, JSON.stringify(documentos));
}

export function createAsyncStorageDocumentoAssinadoRepository(): DocumentoAssinadoRepository {
  return {
    async list(usuarioId) {
      const todos = await lerDocumentos();
      return ordenarDocumentosMaisNovosPrimeiro(todos.filter((documento) => documento.usuarioId === usuarioId));
    },
    async findById(id) {
      return (await lerDocumentos()).find((documento) => documento.id === id) ?? null;
    },
    async save(documento) {
      const atuais = await lerDocumentos();
      await gravarDocumentos([...atuais.filter((atual) => atual.id !== documento.id), documento]);
    },
    async delete(id) {
      const atuais = await lerDocumentos();
      await gravarDocumentos(atuais.filter((atual) => atual.id !== id));
    },
    async clear() {
      await AsyncStorage.removeItem(DOCUMENTOS_STORAGE_KEY);
    },
  };
}


