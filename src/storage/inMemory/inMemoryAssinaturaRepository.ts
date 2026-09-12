import { ordenarAssinaturasMaisNovasPrimeiro, type Assinatura } from '../../domain/assinatura';
import type { AssinaturaRepository } from '../repositories';

export function createInMemoryAssinaturaRepository(): AssinaturaRepository {
  let assinaturas: readonly Assinatura[] = [];

  return {
    async list() {
      return ordenarAssinaturasMaisNovasPrimeiro(assinaturas);
    },
    async save(assinatura) {
      assinaturas = [...assinaturas.filter((atual) => atual.id !== assinatura.id), assinatura];
    },
    async delete(id) {
      assinaturas = assinaturas.filter((atual) => atual.id !== id);
    },
  };
}
