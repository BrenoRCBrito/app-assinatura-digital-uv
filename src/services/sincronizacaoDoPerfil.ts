import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { lerObjeto, lerTexto, lerTextoOuNulo } from '../domain/leitura';
import {
  criarCpf,
  criarEmail,
  criarNome,
  criarTelefone,
  type PerfilParaSincronizar,
  type UsuarioId,
} from '../domain/usuario';
import type { PerfilLocal, UsuarioRepository } from '../storage/repositories';
import { obterFirestore } from './firebase';

export type ResultadoDaSincronizacao = Readonly<{ enviados: number; baixados: number; falhou: boolean }>;

type Acao = 'enviar' | 'baixar' | 'marcar' | 'nada';

const COLECAO_DE_USUARIOS = 'usuarios';
const PERFIL_INVALIDO = 'Perfil da nuvem inválido.';

export function perfilParaNuvem(perfil: PerfilParaSincronizar) {
  return {
    email: perfil.email,
    nome: perfil.nome,
    cpf: perfil.cpf,
    telefone: perfil.telefone,
    createdAt: perfil.createdAt,
    updatedAt: perfil.updatedAt,
    deletedAt: perfil.deletedAt,
    servidorEm: serverTimestamp(),
  };
}

export function perfilDaNuvem(id: UsuarioId, dados: unknown): PerfilParaSincronizar {
  const campos = lerObjeto(dados, PERFIL_INVALIDO) as Readonly<Record<string, unknown>>;
  const nome = lerTextoOuNulo(campos.nome, PERFIL_INVALIDO);
  const cpf = lerTextoOuNulo(campos.cpf, PERFIL_INVALIDO);
  const telefone = lerTextoOuNulo(campos.telefone, PERFIL_INVALIDO);
  return {
    id,
    email: criarEmail(lerTexto(campos.email, PERFIL_INVALIDO)),
    nome: nome === null ? null : criarNome(nome),
    cpf: cpf === null ? null : criarCpf(cpf),
    telefone: telefone === null ? null : criarTelefone(telefone),
    createdAt: lerTexto(campos.createdAt, PERFIL_INVALIDO),
    updatedAt: lerTexto(campos.updatedAt, PERFIL_INVALIDO),
    deletedAt: lerTextoOuNulo(campos.deletedAt, PERFIL_INVALIDO),
  };
}

function decidir(local: PerfilLocal, nuvem: PerfilParaSincronizar | null): Acao {
  if (nuvem === null) {
    return local.pendente ? 'enviar' : 'nada';
  }
  if (nuvem.createdAt !== local.perfil.createdAt || nuvem.updatedAt > local.perfil.updatedAt) {
    return 'baixar';
  }
  if (nuvem.updatedAt === local.perfil.updatedAt) {
    return local.pendente ? 'marcar' : 'nada';
  }
  return local.pendente ? 'enviar' : 'nada';
}

export async function sincronizarPerfil(
  usuarios: UsuarioRepository,
  usuarioId: UsuarioId,
): Promise<ResultadoDaSincronizacao> {
  try {
    const local = await usuarios.lerPerfilLocal(usuarioId);
    if (local === null) {
      return { enviados: 0, baixados: 0, falhou: false };
    }
    const referencia = doc(obterFirestore(), COLECAO_DE_USUARIOS, usuarioId);
    const naNuvem = await getDoc(referencia);
    const nuvem = naNuvem.exists() ? perfilDaNuvem(usuarioId, naNuvem.data()) : null;

    switch (decidir(local, nuvem)) {
      case 'enviar':
        await setDoc(referencia, perfilParaNuvem(local.perfil));
        await usuarios.marcarPerfilSincronizado(usuarioId, local.perfil.updatedAt);
        return { enviados: 1, baixados: 0, falhou: false };
      case 'baixar':
        await usuarios.aplicarPerfilDaNuvem(nuvem as PerfilParaSincronizar);
        return { enviados: 0, baixados: 1, falhou: false };
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
