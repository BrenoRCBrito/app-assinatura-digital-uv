import {
  camposDoDocumento,
  emitirCodigo,
  type Carimbar,
  type CodigoDeAutenticidade,
} from '../domain/codigoDeAutenticidade';
import type { Base64, DocumentoAssinado } from '../domain/documento';
import type { Usuario, UsuarioId } from '../domain/usuario';

export type CodigoEmitido = Readonly<{ codigo: CodigoDeAutenticidade; fotoSha256: string }>;

export type DependenciasDoCodigo = Readonly<{
  buscarUsuario: (id: UsuarioId) => Promise<Usuario | null>;
  resumirSha256: (texto: string) => Promise<string>;
  carimbar: Carimbar;
}>;

export async function emitirCodigoDoDocumento(
  dependencias: DependenciasDoCodigo,
  documento: DocumentoAssinado,
  fotoBase64: Base64,
): Promise<CodigoEmitido> {
  const usuario = await dependencias.buscarUsuario(documento.usuarioId);
  if (usuario === null) {
    throw new Error('A conta que assina o documento não foi encontrada.');
  }
  const resumoDaFoto = await dependencias.resumirSha256(fotoBase64);
  const codigo = await emitirCodigo(camposDoDocumento(documento, usuario, resumoDaFoto), dependencias.carimbar);
  return { codigo, fotoSha256: resumoDaFoto };
}
