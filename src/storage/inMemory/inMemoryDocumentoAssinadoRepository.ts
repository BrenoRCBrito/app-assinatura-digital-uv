import { ordenarDocumentosMaisNovosPrimeiro, type DocumentoAssinado } from '../../domain/documento';
import type { DocumentoAssinadoRepository } from '../repositories';

export function createInMemoryDocumentoAssinadoRepository(): DocumentoAssinadoRepository {
  let documentos: readonly DocumentoAssinado[] = [];

  return {
    async list() {
      return ordenarDocumentosMaisNovosPrimeiro(documentos);
    },
    async findById(id) {
      return documentos.find((documento) => documento.id === id) ?? null;
    },
    async save(documento) {
      documentos = [...documentos.filter((atual) => atual.id !== documento.id), documento];
    },
    async delete(id) {
      documentos = documentos.filter((atual) => atual.id !== id);
    },
  };
}
