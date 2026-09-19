import { requestPermissionsAsync, saveToLibraryAsync } from 'expo-media-library/legacy';

import type { CapturedPhoto } from '../domain/photo';

export async function salvarCopiaNaGaleria(foto: CapturedPhoto): Promise<boolean> {
  try {
    const permissao = await requestPermissionsAsync(true, ['photo']);
    if (!permissao.granted) {
      return false;
    }
    await saveToLibraryAsync(foto.uri);
    return true;
  } catch (error) {
    console.error('Falha ao salvar a cópia na galeria:', error);
    return false;
  }
}
