import type { Assinatura, AssinaturaId } from '../domain/assinatura';

export interface AssinaturaRepository {
  list(): Promise<readonly Assinatura[]>;
  save(assinatura: Assinatura): Promise<void>;
  delete(id: AssinaturaId): Promise<void>;
}

export type Repositories = Readonly<{
  assinaturas: AssinaturaRepository;
}>;
