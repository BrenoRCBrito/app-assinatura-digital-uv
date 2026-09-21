import { Directory, File, Paths } from 'expo-file-system';

import { createBase64, type Base64, type DocumentoId } from '../domain/documento';
import { createFileUri, type CapturedPhoto, type FileUri } from '../domain/photo';

const PASTA_DOS_DOCUMENTOS = 'documentos';
const NOME_DA_FOTO = 'foto.jpg';
const NOME_DO_PDF = 'documento.pdf';

function pastaDoDocumento(id: DocumentoId): Directory {
  return new Directory(Paths.document, PASTA_DOS_DOCUMENTOS, id);
}

function fotoDoDocumento(id: DocumentoId): File {
  return new File(pastaDoDocumento(id), NOME_DA_FOTO);
}

function pdfDoDocumento(id: DocumentoId): File {
  return new File(pastaDoDocumento(id), NOME_DO_PDF);
}

export function uriFotoDocumento(id: DocumentoId): FileUri {
  return createFileUri(fotoDoDocumento(id).uri);
}

export function uriPdfDocumento(id: DocumentoId): FileUri {
  return createFileUri(pdfDoDocumento(id).uri);
}

export async function copiarFotoDocumento(id: DocumentoId, foto: CapturedPhoto): Promise<void> {
  pastaDoDocumento(id).create({ intermediates: true, idempotent: true });
  await new File(foto.uri).copy(fotoDoDocumento(id), { overwrite: true });
}

export async function lerFotoDocumentoBase64(id: DocumentoId): Promise<Base64> {
  return createBase64(await fotoDoDocumento(id).base64());
}

export async function guardarPdfDocumento(id: DocumentoId, pdf: Base64): Promise<void> {
  pastaDoDocumento(id).create({ intermediates: true, idempotent: true });
  pdfDoDocumento(id).write(pdf, { encoding: 'base64' });
}

export function excluirArquivosDocumento(id: DocumentoId): void {
  const pasta = pastaDoDocumento(id);
  if (pasta.exists) {
    pasta.delete();
  }
}
