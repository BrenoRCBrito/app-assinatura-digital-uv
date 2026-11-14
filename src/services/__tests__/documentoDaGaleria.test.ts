import { ImageManipulator } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { escolherDocumentoDaGaleria } from '../documentoDaGaleria';

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  ImageManipulator: { manipulate: jest.fn() },
}));

const picker = jest.mocked(ImagePicker);
const manipulate = jest.mocked(ImageManipulator.manipulate);

type ImagemSimulada = { width: number; height: number; saveAsync: jest.Mock };
type ContextoSimulado = { resize: jest.Mock; renderAsync: jest.Mock };

function imagem(width: number, height: number): ImagemSimulada {
  return {
    width,
    height,
    saveAsync: jest.fn().mockResolvedValue({ uri: `file:///cache/manipulada-${width}x${height}.jpg`, width, height }),
  };
}

function contexto(renderizada: ImagemSimulada): ContextoSimulado {
  const simulado: ContextoSimulado = { resize: jest.fn(), renderAsync: jest.fn().mockResolvedValue(renderizada) };
  simulado.resize.mockReturnValue(simulado);
  return simulado;
}

function escolherNaGaleria(uri = 'file:///cache/ImagePicker/IMG_0001.heic') {
  picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true } as never);
  picker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [{ uri }] } as never);
}

describe('escolherDocumentoDaGaleria', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('abre a galeria só com imagens, sem recorte, e devolve a foto regravada em JPEG', async () => {
    escolherNaGaleria();
    const original = imagem(3024, 4032);
    manipulate.mockReturnValueOnce(contexto(original) as never);

    await expect(escolherDocumentoDaGaleria()).resolves.toEqual({
      tipo: 'escolhida',
      foto: { uri: 'file:///cache/manipulada-3024x4032.jpg', size: { width: 3024, height: 4032 } },
    });
    expect(picker.launchImageLibraryAsync).toHaveBeenCalledWith({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });
    expect(manipulate).toHaveBeenCalledWith('file:///cache/ImagePicker/IMG_0001.heic');
    // HEIC e PNG da galeria viram JPEG, o formato que o PDF embute, com a mesma qualidade da câmera.
    expect(original.saveAsync).toHaveBeenCalledWith({ format: 'jpeg', compress: 0.6 });
  });

  test('foto maior que a da câmera encolhe pelo lado maior antes de ser gravada', async () => {
    escolherNaGaleria();
    const original = imagem(6048, 8064);
    const reduzida = imagem(3024, 4032);
    const reducao = contexto(reduzida);
    manipulate.mockReturnValueOnce(contexto(original) as never).mockReturnValueOnce(reducao as never);

    const resultado = await escolherDocumentoDaGaleria();

    expect(manipulate).toHaveBeenLastCalledWith(original);
    expect(reducao.resize).toHaveBeenCalledWith({ height: 4032 });
    expect(original.saveAsync).not.toHaveBeenCalled();
    expect(reduzida.saveAsync).toHaveBeenCalledWith({ format: 'jpeg', compress: 0.6 });
    expect(resultado).toEqual({
      tipo: 'escolhida',
      foto: { uri: 'file:///cache/manipulada-3024x4032.jpg', size: { width: 3024, height: 4032 } },
    });
  });

  test('cancelar na galeria devolve cancelada sem mexer em imagem nenhuma', async () => {
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true } as never);
    picker.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null } as never);

    await expect(escolherDocumentoDaGaleria()).resolves.toEqual({ tipo: 'cancelada' });
    expect(manipulate).not.toHaveBeenCalled();
  });

  test('sem permissão das fotos, não abre a galeria e diz se dá para pedir de novo', async () => {
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false } as never);

    await expect(escolherDocumentoDaGaleria()).resolves.toEqual({ tipo: 'semPermissao', podePedirDeNovo: false });
    expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled();
  });
});
