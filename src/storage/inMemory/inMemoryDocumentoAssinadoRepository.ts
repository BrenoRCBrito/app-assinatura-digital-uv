import { ordenarDocumentosMaisNovosPrimeiro, type DocumentoAssinado } from '../../domain/documento';
import type { DocumentoAssinadoRepository } from '../repositories';
import { criarArmazenamentoSincronizavel } from './armazenamentoSincronizavel';

export function createInMemoryDocumentoAssinadoRepository(): DocumentoAssinadoRepository {
  const armazenamento = criarArmazenamentoSincronizavel<DocumentoAssinado>((_documento, agora) => agora);

  return {
    async list(usuarioId) {
      return ordenarDocumentosMaisNovosPrimeiro(armazenamento.ativos(usuarioId));
    },
    async findById(id, usuarioId) {
      const documento = armazenamento.achar(id);
      return documento !== null && documento.usuarioId === usuarioId ? documento : null;
    },
    async save(documento) {
      armazenamento.salvar(documento);
    },
    async delete(id) {
      armazenamento.apagar(id);
    },
    async clear() {
      armazenamento.limpar();
    },
    async listarPendentes(usuarioId) {
      return armazenamento.listarPendentes(usuarioId);
    },
    async lerParaSincronizar(id) {
      return armazenamento.lerParaSincronizar(id);
    },
    async aplicarDaNuvem(registro) {
      armazenamento.aplicarDaNuvem(registro, (existente, novo) =>
        existente === null ? novo : { ...novo, fotoStatus: existente.fotoStatus, pdfStatus: existente.pdfStatus },
      );
    },
    async marcarSincronizado(id, updatedAt) {
      armazenamento.marcarSincronizado(id, updatedAt);
    },
  };
}
