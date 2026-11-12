import type { UsuarioId } from '../domain/usuario';
import type { Repositories } from '../storage/repositories';
import { excluirArquivosDocumento, excluirPastaDaConta } from './fileSystem';
import { sincronizarTudo } from './sincronizacao';

export type PreparoDaSaida = Readonly<{ pendentes: number }>;

// Quantos itens desta conta ainda não foram para a nuvem: o perfil, as assinaturas, os documentos (inclusive
// exclusões) e os arquivos (foto e PDF).
export async function contarPendentes(repositorios: Repositories, usuarioId: UsuarioId): Promise<number> {
  const perfil = await repositorios.usuarios.lerPerfilLocal(usuarioId);
  const [assinaturas, documentos, arquivos] = await Promise.all([
    repositorios.assinaturas.listarPendentes(usuarioId),
    repositorios.documentos.listarPendentes(usuarioId),
    repositorios.documentos.listarArquivosParaEnviar(usuarioId),
  ]);
  return (perfil?.pendente === true ? 1 : 0) + assinaturas.length + documentos.length + arquivos.length;
}

// Antes de sair: sincroniza uma última vez e conta o que ficou para trás (por exemplo, por falta de internet).
export async function prepararSaida(repositorios: Repositories, usuarioId: UsuarioId): Promise<PreparoDaSaida> {
  await sincronizarTudo(repositorios, usuarioId);
  return { pendentes: await contarPendentes(repositorios, usuarioId) };
}

// Apaga deste aparelho tudo o que é desta conta: os arquivos, os dados e o cursor de sincronização (sem ele, o
// próximo login não baixaria nada de novo). O que está na nuvem não é tocado.
export async function apagarDadosDaConta(repositorios: Repositories, usuarioId: UsuarioId): Promise<void> {
  // Documentos de antes de cada conta ter pasta guardam os arquivos fora dela: apaga um a um enquanto se sabe quais são.
  try {
    for (const documento of await repositorios.documentos.list(usuarioId)) {
      excluirArquivosDocumento(documento);
    }
  } catch (error) {
    console.warn('Não foi possível listar os documentos para apagar os arquivos de antes das pastas por conta:', error);
  }
  excluirPastaDaConta(usuarioId);
  await repositorios.documentos.apagarDaConta(usuarioId);
  await repositorios.assinaturas.apagarDaConta(usuarioId);
  await repositorios.usuarios.apagarDaConta(usuarioId);
  await repositorios.cursores.apagarDaConta(usuarioId);
}
