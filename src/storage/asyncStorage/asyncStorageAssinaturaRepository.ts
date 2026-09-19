import AsyncStorage from '@react-native-async-storage/async-storage';

import { ordenarAssinaturasMaisNovasPrimeiro, paraAssinatura, type Assinatura } from '../../domain/assinatura';
import type { AssinaturaRepository } from '../repositories';

export const ASSINATURAS_STORAGE_KEY = '@assinaaqui/assinaturas';

async function lerAssinaturas(): Promise<readonly Assinatura[]> {
  const salvo = await AsyncStorage.getItem(ASSINATURAS_STORAGE_KEY);
  if (salvo === null) {
    return [];
  }
  const dados: unknown = JSON.parse(salvo);
  if (!Array.isArray(dados)) {
    throw new Error('A lista de assinaturas salva está corrompida.');
  }
  return dados.map(paraAssinatura);
}

async function gravarAssinaturas(assinaturas: readonly Assinatura[]): Promise<void> {
  await AsyncStorage.setItem(ASSINATURAS_STORAGE_KEY, JSON.stringify(assinaturas));
}

async function clearAsyncStorageAssinaturaRepository() {
  await AsyncStorage.clear();
  console.log('Assinaturas AsyncStorage wiped');
}

export function createAsyncStorageAssinaturaRepository(): AssinaturaRepository {
  return {
    async list(usuarioId) {
      const todas = await lerAssinaturas();
      return ordenarAssinaturasMaisNovasPrimeiro(todas.filter((assinatura) => assinatura.usuarioId === usuarioId));
    },
    async save(assinatura) {
      const atuais = await lerAssinaturas();
      await gravarAssinaturas([...atuais.filter((atual) => atual.id !== assinatura.id), assinatura]);
    },
    async delete(id) {
      const atuais = await lerAssinaturas();
      await gravarAssinaturas(atuais.filter((atual) => atual.id !== id));
    },
    async clear() {
      await clearAsyncStorageAssinaturaRepository();
    }
  };
}



