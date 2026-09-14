import * as MediaLibrary from 'expo-media-library';

import { createCapturedPhoto } from '../../domain/photo';
import { salvarCopiaNaGaleria } from '../mediaLibrary';

const galeria = MediaLibrary as unknown as Readonly<{
  requestPermissionsAsync: jest.Mock;
  Asset: Readonly<{ create: jest.Mock }>;
}>;

const FOTO = createCapturedPhoto('file:///cache/foto.jpg', 3024, 4032);

describe('mediaLibrary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('pede só a escrita de fotos e salva a foto quando a permissão vem', async () => {
    galeria.requestPermissionsAsync.mockResolvedValue({ granted: true });
    galeria.Asset.create.mockResolvedValue({});

    await expect(salvarCopiaNaGaleria(FOTO)).resolves.toBe(true);

    expect(galeria.requestPermissionsAsync).toHaveBeenCalledWith(true, ['photo']);
    expect(galeria.Asset.create).toHaveBeenCalledWith('file:///cache/foto.jpg');
  });

  test('não salva e devolve false sem permissão', async () => {
    galeria.requestPermissionsAsync.mockResolvedValue({ granted: false });

    await expect(salvarCopiaNaGaleria(FOTO)).resolves.toBe(false);

    expect(galeria.Asset.create).not.toHaveBeenCalled();
  });

  test('devolve false quando a galeria falha', async () => {
    galeria.requestPermissionsAsync.mockResolvedValue({ granted: true });
    galeria.Asset.create.mockRejectedValue(new Error('Sem espaço'));
    const erro = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(salvarCopiaNaGaleria(FOTO)).resolves.toBe(false);

    expect(erro).toHaveBeenCalledTimes(1);
    erro.mockRestore();
  });
});
