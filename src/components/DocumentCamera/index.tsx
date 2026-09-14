import React, { useMemo, useRef, useState } from 'react';
import { CameraView } from 'expo-camera';
import { Pressable, StyleSheet, View } from 'react-native';

import { createCapturedPhoto, type CapturedPhoto } from '../../domain/photo';
import { useAppTheme } from '../../theme';
import { IconButton } from '../IconButton';
import { Text } from '../Text';
import { documentCameraPresets } from './presets';

const PHOTO_QUALITY = 0.8;

type DocumentCameraProps = Readonly<{
  onClose: () => void;
  onCapture: (foto: CapturedPhoto) => void;
  onCaptureError: (error: unknown) => void;
  onMountError: (error: unknown) => void;
}>;

export function DocumentCamera({ onClose, onCapture, onCaptureError, onMountError }: DocumentCameraProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => documentCameraPresets.default(theme), [theme]);
  const camera = useRef<CameraView>(null);
  const capturing = useRef(false);
  const [ready, setReady] = useState(false);

  async function capture() {
    if (camera.current === null || capturing.current) {
      return;
    }
    capturing.current = true;
    try {
      const picture = await camera.current.takePictureAsync({ quality: PHOTO_QUALITY });
      onCapture(createCapturedPhoto(picture.uri, picture.width, picture.height));
    } catch (error) {
      onCaptureError(error);
    } finally {
      capturing.current = false;
    }
  }

  return (
    <View style={styles.camera}>
      <View style={styles.topBar}>
        <IconButton icon="close" label="Fechar câmera" onPress={onClose} preset="overlay" />
        <View style={styles.hint}>
          <Text preset="cameraHint">Enquadre o documento inteiro</Text>
        </View>
        <View style={styles.topBarBalance} />
      </View>
      <View style={styles.viewfinder}>
        <CameraView
          ref={camera}
          style={StyleSheet.absoluteFill}
          onCameraReady={() => setReady(true)}
          onMountError={onMountError}
        />
        <View style={styles.frame}>
          <View style={styles.guideTopLeft} />
          <View style={styles.guideTopRight} />
          <View style={styles.guideBottomLeft} />
          <View style={styles.guideBottomRight} />
        </View>
      </View>
      <View style={styles.shutterArea}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tirar foto"
          accessibilityState={{ disabled: !ready }}
          disabled={!ready}
          onPress={() => {
            void capture();
          }}
          style={({ pressed }) => [styles.shutter, !ready && styles.shutterDisabled, pressed && styles.shutterPressed]}
        >
          <View style={styles.shutterCore} />
        </Pressable>
      </View>
    </View>
  );
}
