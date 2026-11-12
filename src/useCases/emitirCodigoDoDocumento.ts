import type { CodigoCurto } from '../domain/codigoCurto';
import { camposDoDocumento, type CampoDoCodigo } from '../domain/codigoDeAutenticidade';
import type { Base64, DocumentoAssinado } from '../domain/documento';
import type { Usuario, UsuarioId } from '../domain/usuario';

// O resumo da foto é guardado no documento: é o que a nuvem usa para conferir que a foto baixada é a assinada.
export type CodigoEmitido = Readonly<{ codigo: CodigoCurto; fotoSha256: string }>;

export type DependenciasDoCodigo = Readonly<{
  buscarUsuario: (id: UsuarioId) => Promise<Usuario | null>;
  resumirSha256: (texto: string) => Promise<string>;
  registrar: (campos: readonly CampoDoCodigo[]) => Promise<CodigoCurto>;
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
  const codigo = await dependencias.registrar(camposDoDocumento(documento, usuario, resumoDaFoto));
  return { codigo, fotoSha256: resumoDaFoto };
}
