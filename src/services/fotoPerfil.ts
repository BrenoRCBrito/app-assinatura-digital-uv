import * as ImagePicker from 'expo-image-picker';

import { criarFotoPerfil, type FotoPerfil } from '../domain/usuario';

export async function escolherFotoDePerfil(): Promise<FotoPerfil | null> {
  const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permissao.granted) {
    return null;
  }

  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.6,
    base64: true,
  });

  if (resultado.canceled || resultado.assets.length === 0 || resultado.assets[0].base64 === null) {
    return null;
  }

  return criarFotoPerfil(resultado.assets[0].base64 as string);
}
