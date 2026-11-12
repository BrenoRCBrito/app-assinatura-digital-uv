import { ordenarDocumentosMaisNovosPrimeiro, type DocumentoAssinado } from '../../domain/documento';
import type { ArquivoDoDocumento, DocumentoAssinadoRepository, TipoDeArquivo } from '../repositories';
import { criarArmazenamentoSincronizavel } from './armazenamentoSincronizavel';

export function createInMemoryDocumentoAssinadoRepository(): DocumentoAssinadoRepository {
  const armazenamento = criarArmazenamentoSincronizavel<DocumentoAssinado>((_documento, agora) => agora);
  const naNuvem = new Set<string>();
  const chave = (id: string, tipo: TipoDeArquivo) => `${id}/${tipo}`;
  const TIPOS: readonly TipoDeArquivo[] = ['foto', 'pdf'];
  const statusDoArquivo = (documento: DocumentoAssinado, tipo: TipoDeArquivo) =>
    tipo === 'foto' ? documento.fotoStatus : documento.pdfStatus;

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
      naNuvem.clear();
    },
    async apagarDaConta(usuarioId) {
      for (const id of armazenamento.removerDaConta(usuarioId)) {
        for (const tipo of TIPOS) {
          naNuvem.delete(chave(id, tipo));
        }
      }
    },
    async listarArquivosParaEnviar(usuarioId) {
      return armazenamento.todos(usuarioId).flatMap(({ item, deletedAt }): ArquivoDoDocumento[] =>
        deletedAt !== null
          ? []
          : TIPOS.filter((tipo) => statusDoArquivo(item, tipo) === 'local' && !naNuvem.has(chave(item.id, tipo))).map(
              (tipo) => ({ documento: item, tipo }),
            ),
      );
    },
    async definirArquivoNaNuvem(id, tipo, estaNaNuvem) {
      if (estaNaNuvem) {
        naNuvem.add(chave(id, tipo));
      } else {
        naNuvem.delete(chave(id, tipo));
      }
    },
    async marcarArquivoBaixado(id, tipo) {
      armazenamento.substituirSemMarcar(id, (documento) =>
        tipo === 'foto' ? { ...documento, fotoStatus: 'local' } : { ...documento, pdfStatus: 'local' },
      );
      naNuvem.add(chave(id, tipo));
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
