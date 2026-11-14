import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { createSize } from '../domain/geometry';
import { createCapturedPhoto, QUALIDADE_DA_FOTO, reducaoDaFoto, type CapturedPhoto } from '../domain/photo';

export type ResultadoDaGaleria =
  | Readonly<{ tipo: 'escolhida'; foto: CapturedPhoto }>
  | Readonly<{ tipo: 'cancelada' }>
  | Readonly<{ tipo: 'semPermissao'; podePedirDeNovo: boolean }>;

// Sem recorte: no iOS o recorte do seletor é sempre quadrado, e um documento quase nunca é.
const OPCOES = {
  mediaTypes: ['images'],
  allowsEditing: false,
  quality: 1,
} satisfies ImagePicker.ImagePickerOptions;

// A galeria devolve o arquivo no formato original (HEIC no iPhone, às vezes PNG). Regravar em JPEG, já de pé
// e no tamanho da câmera, deixa a foto igual à tirada pelo app: o PDF embute JPEG e a nuvem tem limite de tamanho.
async function regravarComoFotoDoApp(uri: string): Promise<CapturedPhoto> {
  const original = await ImageManipulator.manipulate(uri).renderAsync();
  const reducao = reducaoDaFoto(createSize(original.width, original.height));
  const final =
    reducao === null ? original : await ImageManipulator.manipulate(original).resize(reducao).renderAsync();
  const salva = await final.saveAsync({ format: SaveFormat.JPEG, compress: QUALIDADE_DA_FOTO });
  return createCapturedPhoto(salva.uri, salva.width, salva.height);
}

export async function escolherDocumentoDaGaleria(): Promise<ResultadoDaGaleria> {
  const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permissao.granted) {
    return { tipo: 'semPermissao', podePedirDeNovo: permissao.canAskAgain };
  }
  const resultado = await ImagePicker.launchImageLibraryAsync(OPCOES);
  const escolhida = resultado.canceled ? null : (resultado.assets[0] ?? null);
  if (escolhida === null) {
    return { tipo: 'cancelada' };
  }
  return { tipo: 'escolhida', foto: await regravarComoFotoDoApp(escolhida.uri) };
}
