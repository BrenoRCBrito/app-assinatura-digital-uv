import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import type { PerfilParaSincronizar, UsuarioId } from '../domain/usuario';
import type { UsuarioRepository } from '../storage/repositories';
import { obterFirestore } from './firebase';

export type ResultadoDoEnvio = 'enviado' | 'baixar-antes';

export type ResultadoDaSincronizacao = Readonly<{ enviados: number; baixarAntes: number; falhou: boolean }>;

const COLECAO_DE_USUARIOS = 'usuarios';

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

export async function enviarPerfilParaNuvem(perfil: PerfilParaSincronizar): Promise<ResultadoDoEnvio> {
  const referencia = doc(obterFirestore(), COLECAO_DE_USUARIOS, perfil.id);
  const naNuvem = await getDoc(referencia);
  if (naNuvem.exists()) {
    const dados = naNuvem.data();
    if (dados.createdAt !== perfil.createdAt || dados.updatedAt > perfil.updatedAt) {
      return 'baixar-antes';
    }
    if (dados.updatedAt === perfil.updatedAt) {
      return 'enviado';
    }
  }
  await setDoc(referencia, perfilParaNuvem(perfil));
  return 'enviado';
}

export async function sincronizarPerfil(
  usuarios: UsuarioRepository,
  usuarioId: UsuarioId,
): Promise<ResultadoDaSincronizacao> {
  let enviados = 0;
  let baixarAntes = 0;
  try {
    const pendentes = (await usuarios.listarPerfisPendentes()).filter((perfil) => perfil.id === usuarioId);
    for (const perfil of pendentes) {
      if ((await enviarPerfilParaNuvem(perfil)) === 'enviado') {
        await usuarios.marcarPerfilSincronizado(perfil.id, perfil.updatedAt);
        enviados += 1;
      } else {
        baixarAntes += 1;
      }
    }
    return { enviados, baixarAntes, falhou: false };
  } catch (error) {
    console.warn('Falha ao sincronizar o perfil com a nuvem:', error);
    return { enviados, baixarAntes, falhou: true };
  }
}
