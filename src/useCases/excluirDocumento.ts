import type { DocumentoAssinado } from '../domain/documento';
import type { DocumentoAssinadoRepository } from '../storage/repositories';

export type ResultadoExclusao = 'excluido' | 'falhou';

export type DependenciasExclusao = Readonly<{
  documentos: DocumentoAssinadoRepository;
  excluirArquivosDocumento: (documento: DocumentoAssinado) => void;
}>;

export async function excluirDocumento(
  dependencias: DependenciasExclusao,
  documento: DocumentoAssinado,
): Promise<ResultadoExclusao> {
  try {
    await dependencias.documentos.delete(documento.id);
  } catch (error) {
    console.error('Falha ao excluir o documento:', error);
    return 'falhou';
  }

  try {
    dependencias.excluirArquivosDocumento(documento);
  } catch (error) {
    console.error('Falha ao apagar os arquivos do documento:', error);
  }
  return 'excluido';
}
