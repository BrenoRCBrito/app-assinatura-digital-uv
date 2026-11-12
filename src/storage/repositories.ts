import type { Assinatura, AssinaturaId } from '../domain/assinatura';
import type { DocumentoAssinado, DocumentoId } from '../domain/documento';
import type {
  Cpf,
  Email,
  FotoPerfil,
  Nome,
  PerfilParaSincronizar,
  Telefone,
  Usuario,
  UsuarioId,
} from '../domain/usuario';

export type RegistroSincronizavel<T> = Readonly<{
  item: T;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}>;

export type EstadoLocal<T> = Readonly<{ registro: RegistroSincronizavel<T>; pendente: boolean }>;

export interface Sincronizavel<T> {
  listarPendentes(usuarioId: UsuarioId): Promise<readonly RegistroSincronizavel<T>[]>;
  lerParaSincronizar(id: string): Promise<EstadoLocal<T> | null>;
  aplicarDaNuvem(registro: RegistroSincronizavel<T>): Promise<void>;
  marcarSincronizado(id: string, updatedAt: string): Promise<void>;
}

export interface AssinaturaRepository extends Sincronizavel<Assinatura> {
  list(usuarioId: UsuarioId): Promise<readonly Assinatura[]>;
  save(assinatura: Assinatura): Promise<void>;
  delete(id: AssinaturaId): Promise<void>;
  clear(): Promise<void>;
}

export type TipoDeArquivo = 'foto' | 'pdf';

export type ArquivoDoDocumento = Readonly<{ documento: DocumentoAssinado; tipo: TipoDeArquivo }>;

export interface DocumentoAssinadoRepository extends Sincronizavel<DocumentoAssinado> {
  list(usuarioId: UsuarioId): Promise<readonly DocumentoAssinado[]>;
  findById(id: DocumentoId, usuarioId: UsuarioId): Promise<DocumentoAssinado | null>;
  save(documento: DocumentoAssinado): Promise<void>;
  delete(id: DocumentoId): Promise<void>;
  clear(): Promise<void>;
  listarArquivosParaEnviar(usuarioId: UsuarioId): Promise<readonly ArquivoDoDocumento[]>;
  listarArquivosParaApagar(usuarioId: UsuarioId): Promise<readonly ArquivoDoDocumento[]>;
  definirArquivoNaNuvem(id: string, tipo: TipoDeArquivo, naNuvem: boolean): Promise<void>;
  marcarArquivoBaixado(id: string, tipo: TipoDeArquivo): Promise<void>;
}

export type PerfilLocal = Readonly<{ perfil: PerfilParaSincronizar; pendente: boolean }>;

export interface UsuarioRepository {
  findByEmail(email: Email): Promise<Usuario | null>;
  findById(id: UsuarioId): Promise<Usuario | null>;
  create(
    dados: Readonly<{ id: UsuarioId; email: Email; nome?: Nome; cpf?: Cpf; telefone?: Telefone }>,
  ): Promise<Usuario>;
  updateEmail(id: UsuarioId, email: Email): Promise<Usuario>;
  updateNome(id: UsuarioId, nome: Nome): Promise<Usuario>;
  updateCpf(id: UsuarioId, cpf: Cpf): Promise<Usuario>;
  updateTelefone(id: UsuarioId, telefone: Telefone): Promise<Usuario>;
  updateFoto(id: UsuarioId, foto: FotoPerfil | null): Promise<Usuario>;
  listarPerfisPendentes(): Promise<readonly PerfilParaSincronizar[]>;
  lerPerfilLocal(id: UsuarioId): Promise<PerfilLocal | null>;
  aplicarPerfilDaNuvem(perfil: PerfilParaSincronizar): Promise<void>;
  marcarPerfilSincronizado(id: UsuarioId, updatedAt: string): Promise<void>;
  clear(): Promise<void>;
}

export type ColecaoSincronizada = 'assinaturas' | 'documentos';

export type CursorDeSincronizacao = Readonly<{ segundos: number; nanos: number }>;

export interface CursorRepository {
  ler(usuarioId: UsuarioId, colecao: ColecaoSincronizada): Promise<CursorDeSincronizacao | null>;
  gravar(usuarioId: UsuarioId, colecao: ColecaoSincronizada, cursor: CursorDeSincronizacao): Promise<void>;
  clear(): Promise<void>;
}

export type Repositories = Readonly<{
  cursores: CursorRepository;
  assinaturas: AssinaturaRepository;
  documentos: DocumentoAssinadoRepository;
  usuarios: UsuarioRepository;
}>;
