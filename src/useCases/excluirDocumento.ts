import type { DocumentoId } from '../domain/documento';
import type { DocumentoAssinadoRepository } from '../storage/repositories';

export type ResultadoExclusao = 'excluido' | 'falhou';

export type DependenciasExclusao = Readonly<{
  documentos: DocumentoAssinadoRepository;
  excluirArquivosDocumento: (id: DocumentoId) => void;
}>;

export async function excluirDocumento(
  dependencias: DependenciasExclusao,
  id: DocumentoId,
): Promise<ResultadoExclusao> {
  try {
    await dependencias.documentos.delete(id);
  } catch (error) {
    console.error('Falha ao excluir o documento:', error);
    return 'falhou';
  }

  try {
    dependencias.excluirArquivosDocumento(id);
  } catch (error) {
    console.error('Falha ao apagar os arquivos do documento:', error);
  }
  return 'excluido';
}
