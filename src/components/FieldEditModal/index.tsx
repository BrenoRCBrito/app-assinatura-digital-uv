import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';

import { useAppTheme } from '../../theme';
import { Icon } from '../Icon';
import { Text } from '../Text';
import { fieldEditModalPresets } from './presets';

type FieldEditModalProps = Readonly<{
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}>;

export function FieldEditModal({ visible, title, onClose, children }: FieldEditModalProps) {
  const { theme } = useAppTheme();
  const styles = fieldEditModalPresets.default(theme);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.scrim} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text preset="itemTitle">{title}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={onClose} hitSlop={8}>
              <Icon name="close" size="inline" color={styles.closeColor} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
