import { useCallback } from 'react';
import { useCameraPermissions, type PermissionResponse } from 'expo-camera';
import { Linking } from 'react-native';

export type CameraPermissionStatus = 'checking' | 'granted' | 'askable' | 'blocked';

export type CameraPermission = Readonly<{
  status: CameraPermissionStatus;
  request: () => Promise<void>;
  openSettings: () => Promise<void>;
}>;

function statusOf(permission: PermissionResponse | null): CameraPermissionStatus {
  if (permission === null) {
    return 'checking';
  }
  if (permission.granted) {
    return 'granted';
  }
  return permission.canAskAgain ? 'askable' : 'blocked';
}

export function useCameraPermission(): CameraPermission {
  const [permission, requestPermission] = useCameraPermissions();

  const request = useCallback(async () => {
    await requestPermission();
  }, [requestPermission]);

  const openSettings = useCallback(async () => {
    await Linking.openSettings();
  }, []);

  return { status: statusOf(permission), request, openSettings };
}
