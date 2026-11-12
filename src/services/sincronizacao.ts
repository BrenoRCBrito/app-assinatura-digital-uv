import type { UsuarioId } from '../domain/usuario';
import type { CursorRepository, Repositories } from '../storage/repositories';
import { adaptadorDeAssinaturas, adaptadorDeDocumentos } from './adaptadoresDeSincronizacao';
import { sincronizarArquivos, type ResultadoDosArquivos } from './sincronizacaoDeArquivos';
import { sincronizarColecao, type AdaptadorDeColecao, type ResultadoDaColecao } from './sincronizacaoDeColecao';
import { sincronizarPerfil, type ResultadoDaSincronizacao } from './sincronizacaoDoPerfil';

const emAndamento = new Map<string, Promise<ResultadoDaSincronizacao>>();

async function sincronizarSemLancar<T extends Readonly<{ id: string }>>(
  adaptador: AdaptadorDeColecao<T>,
  cursores: CursorRepository,
  usuarioId: UsuarioId,
): Promise<ResultadoDaColecao> {
  try {
    return await sincronizarColecao(adaptador, cursores, usuarioId);
  } catch (error) {
    console.warn(`Falha ao sincronizar ${adaptador.colecao} com a nuvem:`, error);
    return { enviados: 0, baixados: 0, falhas: 1 };
  }
}

async function sincronizarArquivosSemLancar(
  documentos: Repositories['documentos'],
  usuarioId: UsuarioId,
): Promise<ResultadoDosArquivos> {
  try {
    return await sincronizarArquivos(documentos, usuarioId);
  } catch (error) {
    console.warn('Falha ao sincronizar os arquivos com a nuvem:', error);
    return { enviados: 0, apagados: 0, falhas: 1 };
  }
}

async function executar(repositorios: Repositories, usuarioId: UsuarioId): Promise<ResultadoDaSincronizacao> {
  const perfil = await sincronizarPerfil(repositorios.usuarios, usuarioId);
  if (perfil.falhou) {
    return perfil;
  }

  const { cursores } = repositorios;
  const assinaturas = await sincronizarSemLancar(adaptadorDeAssinaturas(repositorios.assinaturas), cursores, usuarioId);
  const documentos = await sincronizarSemLancar(adaptadorDeDocumentos(repositorios.documentos), cursores, usuarioId);
  const arquivos = await sincronizarArquivosSemLancar(repositorios.documentos, usuarioId);
  return {
    enviados: perfil.enviados + assinaturas.enviados + documentos.enviados + arquivos.enviados,
    baixados: perfil.baixados + assinaturas.baixados + documentos.baixados,
    falhou: assinaturas.falhas > 0 || documentos.falhas > 0 || arquivos.falhas > 0,
  };
}

export function sincronizarTudo(repositorios: Repositories, usuarioId: UsuarioId): Promise<ResultadoDaSincronizacao> {
  const atual = emAndamento.get(usuarioId);
  if (atual !== undefined) {
    return atual;
  }
  const execucao = executar(repositorios, usuarioId).finally(() => {
    emAndamento.delete(usuarioId);
  });
  emAndamento.set(usuarioId, execucao);
  return execucao;
}
