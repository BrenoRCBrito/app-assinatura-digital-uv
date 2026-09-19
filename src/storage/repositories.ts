import type { Assinatura, AssinaturaId } from '../domain/assinatura';
import type { DocumentoAssinado, DocumentoId } from '../domain/documento';
import type { Email, Usuario, UsuarioId } from '../domain/usuario';

export interface AssinaturaRepository {
  list(usuarioId: UsuarioId): Promise<readonly Assinatura[]>;
  save(assinatura: Assinatura): Promise<void>;
  delete(id: AssinaturaId): Promise<void>;
}

export interface DocumentoAssinadoRepository {
  list(usuarioId: UsuarioId): Promise<readonly DocumentoAssinado[]>;
  findById(id: DocumentoId): Promise<DocumentoAssinado | null>;
  save(documento: DocumentoAssinado): Promise<void>;
  delete(id: DocumentoId): Promise<void>;
}

export interface UsuarioRepository {
  findByEmail(email: Email): Promise<Usuario | null>;
  create(dados: Readonly<{ email: Email; senhaHash: string }>): Promise<Usuario>;
}

export type Repositories = Readonly<{
  assinaturas: AssinaturaRepository;
  documentos: DocumentoAssinadoRepository;
  usuarios: UsuarioRepository;
}>;
