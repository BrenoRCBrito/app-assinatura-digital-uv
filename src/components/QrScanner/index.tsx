import React, { useMemo } from 'react';
import { CameraView, type BarcodeScanningResult, type BarcodeSettings } from 'expo-camera';
import { StyleSheet, View } from 'react-native';

import { useAppTheme } from '../../theme';
import { IconButton } from '../IconButton';
import { Text } from '../Text';
import { qrScannerPresets } from './presets';

const SO_QR: BarcodeSettings = { barcodeTypes: ['qr'] };

type QrScannerProps = Readonly<{
  ativo: boolean;
  onLido: (texto: string) => void;
  onClose: () => void;
  onMountError: (error: unknown) => void;
}>;

export function QrScanner({ ativo, onLido, onClose, onMountError }: QrScannerProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => qrScannerPresets.default(theme), [theme]);

  return (
    <View style={styles.camera}>
      <View style={styles.topBar}>
        <IconButton icon="close" label="Fechar leitor" onPress={onClose} preset="overlay" />
        <View style={styles.hint}>
          <Text preset="cameraHint">Aponte para o QR do documento</Text>
        </View>
        <View style={styles.topBarBalance} />
      </View>
      <View style={styles.viewfinder}>
        <CameraView
          style={StyleSheet.absoluteFill}
          barcodeScannerSettings={SO_QR}
          onBarcodeScanned={ativo ? (resultado: BarcodeScanningResult) => onLido(resultado.data) : undefined}
          onMountError={onMountError}
        />
      </View>
    </View>
  );
}
