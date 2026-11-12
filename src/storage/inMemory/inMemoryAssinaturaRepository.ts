import { ordenarAssinaturasMaisNovasPrimeiro, type Assinatura } from '../../domain/assinatura';
import type { AssinaturaRepository } from '../repositories';
import { criarArmazenamentoSincronizavel } from './armazenamentoSincronizavel';

export function createInMemoryAssinaturaRepository(): AssinaturaRepository {
  const armazenamento = criarArmazenamentoSincronizavel<Assinatura>((assinatura) => assinatura.criadaEm);

  return {
    async list(usuarioId) {
      return ordenarAssinaturasMaisNovasPrimeiro(armazenamento.ativos(usuarioId));
    },
    async save(assinatura) {
      armazenamento.salvar(assinatura);
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
      armazenamento.aplicarDaNuvem(registro, (_existente, novo) => novo);
    },
    async marcarSincronizado(id, updatedAt) {
      armazenamento.marcarSincronizado(id, updatedAt);
    },
  };
}
