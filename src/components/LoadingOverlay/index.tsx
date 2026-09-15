import React, { useMemo } from 'react';
import { Modal, View } from 'react-native';

import { useAppTheme } from '../../theme';
import { LoadingIndicator } from '../LoadingIndicator';
import { Text } from '../Text';
import { loadingOverlayPresets } from './presets';

type LoadingOverlayProps = Readonly<{
  visible: boolean;
  message: string;
}>;

export function LoadingOverlay({ visible, message }: LoadingOverlayProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => loadingOverlayPresets.default(theme), [theme]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => undefined}
    >
      <View style={styles.scrim}>
        <View style={styles.card}>
          <LoadingIndicator />
          <Text preset="itemTitle">{message}</Text>
        </View>
      </View>
    </Modal>
  );
}
