import type { Assinatura, AssinaturaId } from '../domain/assinatura';
import type { DocumentoAssinado, DocumentoId } from '../domain/documento';
import type { Email, Usuario, UsuarioId , Cpf , Telefone , FotoPerfil} from '../domain/usuario';

export interface AssinaturaRepository {
  list(usuarioId: UsuarioId): Promise<readonly Assinatura[]>;
  save(assinatura: Assinatura): Promise<void>;
  delete(id: AssinaturaId): Promise<void>;
  clear(): Promise<void>;
}

export interface DocumentoAssinadoRepository {
  list(usuarioId: UsuarioId): Promise<readonly DocumentoAssinado[]>;
  findById(id: DocumentoId): Promise<DocumentoAssinado | null>;
  save(documento: DocumentoAssinado): Promise<void>;
  delete(id: DocumentoId): Promise<void>;
  clear(): Promise<void>;
}

export interface UsuarioRepository {
  findByEmail(email: Email): Promise<Usuario | null>;
  findById(id: UsuarioId): Promise<Usuario | null>;
  create(dados: Readonly<{ email: Email; senhaHash: string }>): Promise<Usuario>;
  updateEmail(id: UsuarioId, email: Email): Promise<Usuario>;
  updateSenha(id: UsuarioId, senhaHash: string): Promise<Usuario>;
  updateCpf(id: UsuarioId, cpf: Cpf): Promise<Usuario>;
  updateTelefone(id: UsuarioId, telefone: Telefone): Promise<Usuario>;
  updateFoto(id: UsuarioId, foto: FotoPerfil | null): Promise<Usuario>;   // ADICIONAR
  clear(): Promise<void>;
}


export type Repositories = Readonly<{
  assinaturas: AssinaturaRepository;
  documentos: DocumentoAssinadoRepository;
  usuarios: UsuarioRepository;
}>;
