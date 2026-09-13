import * as ScreenOrientation from 'expo-screen-orientation';

export function lockToPortrait(): Promise<void> {
  return ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
}

export function lockToLandscape(): Promise<void> {
  return ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
}
