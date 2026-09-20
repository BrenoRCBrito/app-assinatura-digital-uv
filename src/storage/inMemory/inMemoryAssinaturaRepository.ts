import { ordenarAssinaturasMaisNovasPrimeiro, type Assinatura } from '../../domain/assinatura';
import type { AssinaturaRepository } from '../repositories';

export function createInMemoryAssinaturaRepository(): AssinaturaRepository {
  let assinaturas: readonly Assinatura[] = [];

  return {
    async list(usuarioId) {
      return ordenarAssinaturasMaisNovasPrimeiro(assinaturas.filter((a) => a.usuarioId === usuarioId));
    },
    async save(assinatura) {
      assinaturas = [...assinaturas.filter((atual) => atual.id !== assinatura.id), assinatura];
    },
    async delete(id) {
      assinaturas = assinaturas.filter((atual) => atual.id !== id);
    },
    async clear() {
      assinaturas = [];
    },
  };
}

