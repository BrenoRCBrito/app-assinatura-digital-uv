import { Asset, requestPermissionsAsync } from 'expo-media-library';

import type { CapturedPhoto } from '../domain/photo';

export async function salvarCopiaNaGaleria(foto: CapturedPhoto): Promise<boolean> {
  try {
    const permissao = await requestPermissionsAsync(true, ['photo']);
    if (!permissao.granted) {
      return false;
    }
    await Asset.create(foto.uri);
    return true;
  } catch (error) {
    console.error('Falha ao salvar a cópia na galeria:', error);
    return false;
  }
}
