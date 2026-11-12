import { get, ref, remove, set } from 'firebase/database';

import { lerObjeto, lerTexto } from '../domain/leitura';
import { criarFotoPerfil, type FotoPerfil, type UsuarioId } from '../domain/usuario';
import { resumirSha256 } from './crypto';
import { obterBancoDeArquivos } from './firebase';
import { TAMANHO_MAXIMO_DO_ARQUIVO, TEMPO_LIMITE_DA_LEITURA, TEMPO_LIMITE_DO_ENVIO } from './sincronizacaoDeArquivos';
import { comTempoLimite } from './tempoLimite';

const FOTO_INVALIDA = 'Foto de perfil da nuvem inválida.';

// A foto de perfil mora no mesmo lugar dos arquivos dos documentos, com o nome "perfil" no lugar do id do documento
// (um id de documento nunca é "perfil"), então as regras do banco já valem para ela.
function caminhoDaFoto(usuarioId: UsuarioId): string {
  return `arquivos/${usuarioId}/perfil/foto`;
}

// Cria ou troca a foto na nuvem: ela sempre ocupa o mesmo lugar, então a foto antiga é substituída, nunca acumulada.
// Se o que está lá já é esta mesma foto (pelo resumo), não grava de novo.
export async function enviarFotoDePerfil(usuarioId: UsuarioId, foto: FotoPerfil, sha256: string): Promise<void> {
  if (foto.length > TAMANHO_MAXIMO_DO_ARQUIVO) {
    throw new Error('A foto de perfil é grande demais para a nuvem.');
  }
  const banco = obterBancoDeArquivos();
  const caminho = caminhoDaFoto(usuarioId);
  const naNuvem = await comTempoLimite(
    get(ref(banco, `${caminho}/sha256`)),
    TEMPO_LIMITE_DA_LEITURA,
    'A consulta à nuvem demorou demais.',
  );
  if (naNuvem.exists() && naNuvem.val() === sha256) {
    return;
  }
  await comTempoLimite(
    set(ref(banco, caminho), { dados: foto, sha256 }),
    TEMPO_LIMITE_DO_ENVIO,
    'O envio da foto para a nuvem demorou demais.',
  );
}

// A foto de perfil muda com frequência, então, diferente dos arquivos dos documentos, ela é apagada da nuvem quando
// a pessoa remove a foto (as regras abrem essa exceção só para este caminho). Apagar o que não existe não faz mal.
export async function removerFotoDePerfil(usuarioId: UsuarioId): Promise<void> {
  await comTempoLimite(
    remove(ref(obterBancoDeArquivos(), caminhoDaFoto(usuarioId))),
    TEMPO_LIMITE_DA_LEITURA,
    'A remoção da foto na nuvem demorou demais.',
  );
}

// Baixa a foto e só a aceita se o resumo bater com o que o perfil na nuvem diz que ela é.
export async function baixarFotoDePerfil(usuarioId: UsuarioId, sha256Esperado: string): Promise<FotoPerfil> {
  const naNuvem = await comTempoLimite(
    get(ref(obterBancoDeArquivos(), caminhoDaFoto(usuarioId))),
    TEMPO_LIMITE_DO_ENVIO,
    'O download da foto da nuvem demorou demais.',
  );
  if (!naNuvem.exists()) {
    throw new Error('A foto de perfil ainda não está na nuvem.');
  }
  const campos = lerObjeto(naNuvem.val(), FOTO_INVALIDA) as Readonly<Record<string, unknown>>;
  const foto = criarFotoPerfil(lerTexto(campos.dados, FOTO_INVALIDA));
  const resumoGuardado = lerTexto(campos.sha256, FOTO_INVALIDA);
  const resumoCalculado = await resumirSha256(foto);
  if (resumoCalculado !== resumoGuardado || resumoCalculado !== sha256Esperado) {
    throw new Error('A foto de perfil baixada não confere com o resumo esperado.');
  }
  return foto;
}
