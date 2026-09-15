import type { Assinatura, AssinaturaId } from '../domain/assinatura';
import type { DocumentoAssinado, DocumentoId } from '../domain/documento';

export interface AssinaturaRepository {
  list(): Promise<readonly Assinatura[]>;
  save(assinatura: Assinatura): Promise<void>;
  delete(id: AssinaturaId): Promise<void>;
}

export interface DocumentoAssinadoRepository {
  list(): Promise<readonly DocumentoAssinado[]>;
  findById(id: DocumentoId): Promise<DocumentoAssinado | null>;
  save(documento: DocumentoAssinado): Promise<void>;
  delete(id: DocumentoId): Promise<void>;
}

export type Repositories = Readonly<{
  assinaturas: AssinaturaRepository;
  documentos: DocumentoAssinadoRepository;
}>;
