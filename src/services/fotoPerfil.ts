import * as ImagePicker from 'expo-image-picker';

import { criarFotoPerfil, type FotoPerfil } from '../domain/usuario';

export type ResultadoFotoPerfil =
  | Readonly<{ tipo: 'escolhida'; foto: FotoPerfil }>
  | Readonly<{ tipo: 'cancelada' }>
  | Readonly<{ tipo: 'semPermissao'; podePedirDeNovo: boolean }>;

const OPCOES = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.6,
  base64: true,
} satisfies ImagePicker.ImagePickerOptions;

function lerResultado(resultado: ImagePicker.ImagePickerResult): ResultadoFotoPerfil {
  const base64 = resultado.canceled ? null : (resultado.assets[0]?.base64 ?? null);
  return base64 === null ? { tipo: 'cancelada' } : { tipo: 'escolhida', foto: criarFotoPerfil(base64) };
}

export async function escolherFotoDaGaleria(): Promise<ResultadoFotoPerfil> {
  const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permissao.granted) {
    return { tipo: 'semPermissao', podePedirDeNovo: permissao.canAskAgain };
  }
  return lerResultado(await ImagePicker.launchImageLibraryAsync(OPCOES));
}

export async function tirarFotoDePerfil(): Promise<ResultadoFotoPerfil> {
  const permissao = await ImagePicker.requestCameraPermissionsAsync();
  if (!permissao.granted) {
    return { tipo: 'semPermissao', podePedirDeNovo: permissao.canAskAgain };
  }
  return lerResultado(await ImagePicker.launchCameraAsync(OPCOES));
}
