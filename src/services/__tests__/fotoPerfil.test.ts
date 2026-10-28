import * as ImagePicker from 'expo-image-picker';

import { escolherFotoDaGaleria, tirarFotoDePerfil } from '../fotoPerfil';

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));

const picker = jest.mocked(ImagePicker);
const OPCOES = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.6, base64: true };

describe('fotoPerfil', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('galeria: com permissão, devolve a foto escolhida em base64', async () => {
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true } as never);
    picker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [{ base64: 'Zm90bw==' }] } as never);

    await expect(escolherFotoDaGaleria()).resolves.toEqual({ tipo: 'escolhida', foto: 'Zm90bw==' });
    expect(picker.launchImageLibraryAsync).toHaveBeenCalledWith(OPCOES);
  });

  test('câmera: com permissão, abre a câmera e devolve a foto tirada', async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: true } as never);
    picker.launchCameraAsync.mockResolvedValue({ canceled: false, assets: [{ base64: 'Zm90bw==' }] } as never);

    await expect(tirarFotoDePerfil()).resolves.toEqual({ tipo: 'escolhida', foto: 'Zm90bw==' });
    expect(picker.launchCameraAsync).toHaveBeenCalledWith(OPCOES);
    expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled();
  });

  test('cancelar na galeria ou na câmera devolve cancelada', async () => {
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true } as never);
    picker.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null } as never);
    picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: true } as never);
    picker.launchCameraAsync.mockResolvedValue({ canceled: true, assets: null } as never);

    await expect(escolherFotoDaGaleria()).resolves.toEqual({ tipo: 'cancelada' });
    await expect(tirarFotoDePerfil()).resolves.toEqual({ tipo: 'cancelada' });
  });

  test('imagem sem base64 conta como cancelada em vez de salvar uma foto vazia', async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: true } as never);
    picker.launchCameraAsync.mockResolvedValue({ canceled: false, assets: [{ base64: null }] } as never);

    await expect(tirarFotoDePerfil()).resolves.toEqual({ tipo: 'cancelada' });
  });

  test('sem permissão da câmera, não abre a câmera e diz se dá para pedir de novo', async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true } as never);

    await expect(tirarFotoDePerfil()).resolves.toEqual({ tipo: 'semPermissao', podePedirDeNovo: true });
    expect(picker.launchCameraAsync).not.toHaveBeenCalled();
  });

  test('sem permissão da galeria e bloqueada, avisa que não dá para pedir de novo', async () => {
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false } as never);

    await expect(escolherFotoDaGaleria()).resolves.toEqual({ tipo: 'semPermissao', podePedirDeNovo: false });
    expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled();
  });
});
