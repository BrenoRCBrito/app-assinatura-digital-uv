import * as ScreenOrientation from 'expo-screen-orientation';

import { lockToLandscape, lockToPortrait } from '../screenOrientation';

jest.mock('expo-screen-orientation', () => ({
  ...jest.requireActual('expo-screen-orientation'),
  lockAsync: jest.fn(() => Promise.resolve()),
}));

describe('screenOrientation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('lockToPortrait trava a tela em retrato, com o topo para cima', async () => {
    await lockToPortrait();

    expect(ScreenOrientation.lockAsync).toHaveBeenCalledWith(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  });

  test('lockToLandscape trava a tela em paisagem', async () => {
    await lockToLandscape();

    expect(ScreenOrientation.lockAsync).toHaveBeenCalledWith(ScreenOrientation.OrientationLock.LANDSCAPE);
  });
});
