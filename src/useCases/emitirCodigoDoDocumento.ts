import type { CodigoCurto } from '../domain/codigoCurto';
import { camposDoDocumento, type CampoDoCodigo } from '../domain/codigoDeAutenticidade';
import type { Base64, DocumentoAssinado } from '../domain/documento';
import type { Usuario, UsuarioId } from '../domain/usuario';

export type DependenciasDoCodigo = Readonly<{
  buscarUsuario: (id: UsuarioId) => Promise<Usuario | null>;
  resumirSha256: (texto: string) => Promise<string>;
  registrar: (campos: readonly CampoDoCodigo[]) => Promise<CodigoCurto>;
}>;

export async function emitirCodigoDoDocumento(
  dependencias: DependenciasDoCodigo,
  documento: DocumentoAssinado,
  fotoBase64: Base64,
): Promise<CodigoCurto> {
  const usuario = await dependencias.buscarUsuario(documento.usuarioId);
  if (usuario === null) {
    throw new Error('A conta que assina o documento não foi encontrada.');
  }
  const resumoDaFoto = await dependencias.resumirSha256(fotoBase64);
  return dependencias.registrar(camposDoDocumento(documento, usuario, resumoDaFoto));
}
