import { renderHook } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { useCameraPermission } from '../useCameraPermission';

jest.mock('expo-camera', () => ({ useCameraPermissions: jest.fn() }));

const camera = jest.requireMock<{ useCameraPermissions: jest.Mock }>('expo-camera');

describe('useCameraPermission', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test.each([
    ['checking', null],
    ['granted', { granted: true, canAskAgain: true }],
    ['askable', { granted: false, canAskAgain: true }],
    ['blocked', { granted: false, canAskAgain: false }],
  ])('fica %s conforme a resposta da câmera', async (estado, permissao) => {
    camera.useCameraPermissions.mockReturnValue([permissao, jest.fn(), jest.fn()]);

    const { result } = await renderHook(() => useCameraPermission());

    expect(result.current.status).toBe(estado);
  });

  test('pede a permissão da câmera', async () => {
    const pedir = jest.fn().mockResolvedValue({ granted: true, canAskAgain: true });
    camera.useCameraPermissions.mockReturnValue([{ granted: false, canAskAgain: true }, pedir, jest.fn()]);

    const { result } = await renderHook(() => useCameraPermission());
    await result.current.request();

    expect(pedir).toHaveBeenCalledTimes(1);
  });

  test('abre as configurações do aparelho', async () => {
    camera.useCameraPermissions.mockReturnValue([{ granted: false, canAskAgain: false }, jest.fn(), jest.fn()]);
    const abrir = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);

    const { result } = await renderHook(() => useCameraPermission());
    await result.current.openSettings();

    expect(abrir).toHaveBeenCalledTimes(1);
    abrir.mockRestore();
  });
});
