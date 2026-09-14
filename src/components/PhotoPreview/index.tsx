import React, { useMemo } from 'react';
import { Image, Modal, View } from 'react-native';

import type { CapturedPhoto } from '../../domain/photo';
import { useAppTheme } from '../../theme';
import { Button } from '../Button';
import { Row } from '../Layout';
import { Screen } from '../Screen';
import { Text } from '../Text';
import { photoPreviewPresets } from './presets';

type PhotoPreviewProps = Readonly<{
  foto: CapturedPhoto | null;
  saving: boolean;
  onRetake: () => void;
  onUse: () => void;
}>;

export function PhotoPreview({ foto, saving, onRetake, onUse }: PhotoPreviewProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => photoPreviewPresets.default(theme), [theme]);

  function requestClose() {
    if (!saving) {
      onRetake();
    }
  }

  return (
    <Modal
      visible={foto !== null}
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={requestClose}
    >
      <Screen
        preset="preview"
        footer={
          <Row gap="actions">
            <Button label="Tirar outra" onPress={onRetake} preset="secondary" disabled={saving} flex={1} />
            <Button label="Usar foto" onPress={onUse} disabled={saving} flex={1} />
          </Row>
        }
      >
        <View style={styles.titleBar}>
          <Text preset="photoTitle">Prévia</Text>
        </View>
        <View style={styles.photoArea}>
          {foto === null ? null : (
            <Image
              accessibilityLabel="Foto do documento"
              source={{ uri: foto.uri }}
              resizeMode="contain"
              style={styles.photo}
            />
          )}
        </View>
      </Screen>
    </Modal>
  );
}
