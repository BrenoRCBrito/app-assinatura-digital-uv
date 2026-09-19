import * as MediaLibrary from 'expo-media-library/legacy';

import { createCapturedPhoto } from '../../domain/photo';
import { salvarCopiaNaGaleria } from '../mediaLibrary';

const galeria = MediaLibrary as unknown as Readonly<{
  requestPermissionsAsync: jest.Mock;
  saveToLibraryAsync: jest.Mock;
}>;

const FOTO = createCapturedPhoto('file:///cache/foto.jpg', 3024, 4032);

describe('mediaLibrary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('pede só a escrita de fotos e salva a foto quando a permissão vem', async () => {
    galeria.requestPermissionsAsync.mockResolvedValue({ granted: true });
    galeria.saveToLibraryAsync.mockResolvedValue({});

    await expect(salvarCopiaNaGaleria(FOTO)).resolves.toBe(true);

    expect(galeria.requestPermissionsAsync).toHaveBeenCalledWith(true, ['photo']);
    expect(galeria.saveToLibraryAsync).toHaveBeenCalledWith('file:///cache/foto.jpg');
  });

  test('não salva e devolve false sem permissão', async () => {
    galeria.requestPermissionsAsync.mockResolvedValue({ granted: false });

    await expect(salvarCopiaNaGaleria(FOTO)).resolves.toBe(false);

    expect(galeria.saveToLibraryAsync).not.toHaveBeenCalled();
  });

  test('devolve false quando a galeria falha', async () => {
    galeria.requestPermissionsAsync.mockResolvedValue({ granted: true });
    galeria.saveToLibraryAsync.mockRejectedValue(new Error('Sem espaço'));
    const erro = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(salvarCopiaNaGaleria(FOTO)).resolves.toBe(false);

    expect(erro).toHaveBeenCalledTimes(1);
    erro.mockRestore();
  });
});
