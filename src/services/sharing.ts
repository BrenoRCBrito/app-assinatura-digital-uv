import { isAvailableAsync, shareAsync } from 'expo-sharing';

import type { DocumentoAssinado } from '../domain/documento';
import { uriPdfDocumento } from './fileSystem';

export type ResultadoCompartilhamento = 'compartilhado' | 'indisponivel';

export async function compartilharPdf(documento: DocumentoAssinado): Promise<ResultadoCompartilhamento> {
  if (!(await isAvailableAsync())) {
    return 'indisponivel';
  }
  await shareAsync(uriPdfDocumento(documento.id), {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: documento.titulo,
  });
  return 'compartilhado';
}
