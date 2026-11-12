import { Directory, File, Paths } from 'expo-file-system';

import { createBase64, type ArquivosDoDocumento, type Base64 } from '../domain/documento';
import { createFileUri, type CapturedPhoto, type FileUri } from '../domain/photo';

const PASTA_DOS_USUARIOS = 'usuarios';
const PASTA_DOS_DOCUMENTOS = 'documentos';
const NOME_DA_FOTO = 'foto.jpg';
const NOME_DO_PDF = 'documento.pdf';

// Cada conta tem a própria pasta: usuarios/<usuario>/documentos/<documento>. Documentos assinados antes
// disso ficaram em documentos/<documento>, e continuam sendo achados lá enquanto a pasta nova não existe.
function pastaDoDocumento({ id, usuarioId }: ArquivosDoDocumento): Directory {
  const pasta = new Directory(Paths.document, PASTA_DOS_USUARIOS, usuarioId, PASTA_DOS_DOCUMENTOS, id);
  if (pasta.exists) {
    return pasta;
  }
  const pastaAntiga = new Directory(Paths.document, PASTA_DOS_DOCUMENTOS, id);
  return pastaAntiga.exists ? pastaAntiga : pasta;
}

function fotoDoDocumento(documento: ArquivosDoDocumento): File {
  return new File(pastaDoDocumento(documento), NOME_DA_FOTO);
}

function pdfDoDocumento(documento: ArquivosDoDocumento): File {
  return new File(pastaDoDocumento(documento), NOME_DO_PDF);
}

export function uriFotoDocumento(documento: ArquivosDoDocumento): FileUri {
  return createFileUri(fotoDoDocumento(documento).uri);
}

export function uriPdfDocumento(documento: ArquivosDoDocumento): FileUri {
  return createFileUri(pdfDoDocumento(documento).uri);
}

export async function copiarFotoDocumento(documento: ArquivosDoDocumento, foto: CapturedPhoto): Promise<void> {
  pastaDoDocumento(documento).create({ intermediates: true, idempotent: true });
  await new File(foto.uri).copy(fotoDoDocumento(documento), { overwrite: true });
}

export async function lerFotoDocumentoBase64(documento: ArquivosDoDocumento): Promise<Base64> {
  return createBase64(await fotoDoDocumento(documento).base64());
}

export async function guardarFotoDocumento(documento: ArquivosDoDocumento, foto: Base64): Promise<void> {
  pastaDoDocumento(documento).create({ intermediates: true, idempotent: true });
  fotoDoDocumento(documento).write(foto, { encoding: 'base64' });
}

export async function lerPdfDocumentoBase64(documento: ArquivosDoDocumento): Promise<Base64> {
  return createBase64(await pdfDoDocumento(documento).base64());
}

export async function guardarPdfDocumento(documento: ArquivosDoDocumento, pdf: Base64): Promise<void> {
  pastaDoDocumento(documento).create({ intermediates: true, idempotent: true });
  pdfDoDocumento(documento).write(pdf, { encoding: 'base64' });
}

export function excluirArquivosDocumento(documento: ArquivosDoDocumento): void {
  const pasta = pastaDoDocumento(documento);
  if (pasta.exists) {
    pasta.delete();
  }
}
