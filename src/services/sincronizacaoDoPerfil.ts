import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { lerObjeto, lerTexto, lerTextoOuNulo } from '../domain/leitura';
import {
  criarCpf,
  criarEmail,
  criarNome,
  criarTelefone,
  type FotoPerfil,
  type PerfilParaSincronizar,
  type UsuarioId,
} from '../domain/usuario';
import type { PerfilLocal, UsuarioRepository } from '../storage/repositories';
import { resumirSha256 } from './crypto';
import { obterFirestore } from './firebase';
import { baixarFotoDePerfil, enviarFotoDePerfil, removerFotoDePerfil } from './fotoDePerfilNaNuvem';
import { comTempoLimite } from './tempoLimite';

export type ResultadoDaSincronizacao = Readonly<{ enviados: number; baixados: number; falhou: boolean }>;

// O perfil na nuvem: o texto e o resumo da foto (a foto em si fica no Realtime Database). null = sem foto.
export type PerfilNaNuvem = Readonly<{ perfil: PerfilParaSincronizar; fotoSha256: string | null }>;

type Acao = 'enviar' | 'baixar' | 'marcar' | 'nada';

const COLECAO_DE_USUARIOS = 'usuarios';
const TEMPO_LIMITE_DA_GRAVACAO = 15000;
const PERFIL_INVALIDO = 'Perfil da nuvem inválido.';
const SHA256_HEX = /^[0-9a-f]{64}$/;

// As regras do Firestore exigem todos os campos, com null no lugar de "sem valor" (undefined é recusado).
export function perfilParaNuvem(perfil: PerfilParaSincronizar, fotoSha256: string | null) {
  return {
    email: perfil.email,
    nome: perfil.nome,
    cpf: perfil.cpf,
    telefone: perfil.telefone,
    fotoSha256,
    createdAt: perfil.createdAt,
    updatedAt: perfil.updatedAt,
    deletedAt: perfil.deletedAt,
    servidorEm: serverTimestamp(),
  };
}

// O que veio da nuvem passa pelas mesmas validações do app: dado fora do formato é recusado, não gravado.
export function perfilDaNuvem(id: UsuarioId, dados: unknown): PerfilNaNuvem {
  const campos = lerObjeto(dados, PERFIL_INVALIDO) as Readonly<Record<string, unknown>>;
  const nome = lerTextoOuNulo(campos.nome, PERFIL_INVALIDO);
  const cpf = lerTextoOuNulo(campos.cpf, PERFIL_INVALIDO);
  const telefone = lerTextoOuNulo(campos.telefone, PERFIL_INVALIDO);
  // Perfis gravados antes da foto existir na nuvem não têm este campo: contam como "sem foto".
  const fotoSha256 = lerTextoOuNulo(campos.fotoSha256, PERFIL_INVALIDO);
  if (fotoSha256 !== null && !SHA256_HEX.test(fotoSha256)) {
    throw new Error(PERFIL_INVALIDO);
  }
  return {
    perfil: {
      id,
      email: criarEmail(lerTexto(campos.email, PERFIL_INVALIDO)),
      nome: nome === null ? null : criarNome(nome),
      cpf: cpf === null ? null : criarCpf(cpf),
      telefone: telefone === null ? null : criarTelefone(telefone),
      createdAt: lerTexto(campos.createdAt, PERFIL_INVALIDO),
      updatedAt: lerTexto(campos.updatedAt, PERFIL_INVALIDO),
      deletedAt: lerTextoOuNulo(campos.deletedAt, PERFIL_INVALIDO),
    },
    fotoSha256,
  };
}

// A mais nova vence. Um perfil de outra origem (createdAt diferente) é o caso do aparelho novo, que acabou de
// criar o perfil só com o e-mail: ali quem manda é a nuvem. Na mesma versão, só a foto pode divergir (perfil de
// antes da foto subir para a nuvem, ou foto que ainda não chegou neste aparelho).
function decidir(local: PerfilLocal, nuvem: PerfilNaNuvem | null, fotoLocalSha256: string | null): Acao {
  if (nuvem === null) {
    return local.pendente ? 'enviar' : 'nada';
  }
  if (nuvem.perfil.createdAt !== local.perfil.createdAt || nuvem.perfil.updatedAt > local.perfil.updatedAt) {
    return 'baixar';
  }
  if (nuvem.perfil.updatedAt === local.perfil.updatedAt) {
    if (nuvem.fotoSha256 === fotoLocalSha256) {
      return local.pendente ? 'marcar' : 'nada';
    }
    return nuvem.fotoSha256 === null ? 'enviar' : 'baixar';
  }
  return local.pendente ? 'enviar' : 'nada';
}

type TrocaDeFoto = Readonly<{ trocar: false }> | Readonly<{ trocar: true; foto: FotoPerfil | null }>;

// Baixa a foto antes de gravar qualquer coisa: se o download falhar, nada muda e a próxima sincronização tenta de novo.
async function fotoParaAplicar(
  usuarioId: UsuarioId,
  fotoSha256DaNuvem: string | null,
  fotoLocalSha256: string | null,
): Promise<TrocaDeFoto> {
  if (fotoSha256DaNuvem === fotoLocalSha256) {
    return { trocar: false };
  }
  return {
    trocar: true,
    foto: fotoSha256DaNuvem === null ? null : await baixarFotoDePerfil(usuarioId, fotoSha256DaNuvem),
  };
}

// Sincroniza o perfil de quem está logado (texto e foto), com uma só leitura do perfil na nuvem. Nunca lança:
// sem internet ou com erro, nada se perde e a próxima sincronização tenta de novo.
export async function sincronizarPerfil(
  usuarios: UsuarioRepository,
  usuarioId: UsuarioId,
): Promise<ResultadoDaSincronizacao> {
  try {
    const local = await usuarios.lerPerfilLocal(usuarioId);
    if (local === null) {
      return { enviados: 0, baixados: 0, falhou: false };
    }
    const fotoLocal = (await usuarios.findById(usuarioId))?.foto ?? null;
    const fotoLocalSha256 = fotoLocal === null ? null : await resumirSha256(fotoLocal);
    const referencia = doc(obterFirestore(), COLECAO_DE_USUARIOS, usuarioId);
    const naNuvem = await getDoc(referencia);
    const nuvem = naNuvem.exists() ? perfilDaNuvem(usuarioId, naNuvem.data()) : null;

    switch (decidir(local, nuvem, fotoLocalSha256)) {
      case 'enviar':
        // A foto sobe antes do perfil: o perfil na nuvem nunca aponta para uma foto que não está lá.
        if (fotoLocal !== null && fotoLocalSha256 !== null) {
          await enviarFotoDePerfil(usuarioId, fotoLocal, fotoLocalSha256);
        }
        await comTempoLimite(
          setDoc(referencia, perfilParaNuvem(local.perfil, fotoLocalSha256)),
          TEMPO_LIMITE_DA_GRAVACAO,
          'A gravação na nuvem demorou demais.',
        );
        // Sem foto: tira da nuvem a que ficou lá, depois de o perfil já ter deixado de apontar para ela. Se a remoção
        // falhar, o perfil continua pendente e a próxima sincronização repete.
        if (fotoLocal === null && nuvem !== null) {
          await removerFotoDePerfil(usuarioId);
        }
        await usuarios.marcarPerfilSincronizado(usuarioId, local.perfil.updatedAt);
        return { enviados: 1, baixados: 0, falhou: false };
      case 'baixar': {
        const { perfil, fotoSha256 } = nuvem as PerfilNaNuvem;
        const troca = await fotoParaAplicar(usuarioId, fotoSha256, fotoLocalSha256);
        await usuarios.aplicarPerfilDaNuvem(perfil);
        if (troca.trocar) {
          await usuarios.aplicarFotoDaNuvem(usuarioId, troca.foto);
        }
        return { enviados: 0, baixados: 1, falhou: false };
      }
      case 'marcar':
        await usuarios.marcarPerfilSincronizado(usuarioId, local.perfil.updatedAt);
        return { enviados: 0, baixados: 0, falhou: false };
      case 'nada':
        return { enviados: 0, baixados: 0, falhou: false };
    }
  } catch (error) {
    console.warn('Falha ao sincronizar o perfil com a nuvem:', error);
    return { enviados: 0, baixados: 0, falhou: true };
  }
}
