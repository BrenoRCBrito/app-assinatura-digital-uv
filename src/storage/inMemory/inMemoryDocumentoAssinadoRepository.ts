import { ordenarDocumentosMaisNovosPrimeiro, type DocumentoAssinado } from '../../domain/documento';
import type { DocumentoAssinadoRepository } from '../repositories';

export function createInMemoryDocumentoAssinadoRepository(): DocumentoAssinadoRepository {
  let documentos: readonly DocumentoAssinado[] = [];

  return {
    async list(usuarioId) {
      return ordenarDocumentosMaisNovosPrimeiro(documentos.filter((d) => d.usuarioId === usuarioId));
    },
    async findById(id, usuarioId) {
      return documentos.find((documento) => documento.id === id && documento.usuarioId === usuarioId) ?? null;
    },
    async save(documento) {
      documentos = [...documentos.filter((atual) => atual.id !== documento.id), documento];
    },
    async delete(id) {
      documentos = documentos.filter((atual) => atual.id !== id);
    },
    async clear() {
      documentos = [];
    },
  };
}
