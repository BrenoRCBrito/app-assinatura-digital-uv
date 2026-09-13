import React, { useMemo } from 'react';
import { TextInput, View } from 'react-native';

import { useAppTheme } from '../../theme';
import { Text } from '../Text';
import { textFieldPresets, type TextFieldPresetName } from './presets';

type TextFieldProps = Readonly<{
  label: string;
  accessibilityLabel: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  maxLength?: number;
  preset?: TextFieldPresetName;
}>;

export function TextField({
  label,
  accessibilityLabel,
  value,
  onChangeText,
  placeholder,
  maxLength,
  preset = 'default',
}: TextFieldProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => textFieldPresets[preset](theme), [preset, theme]);

  return (
    <View style={styles.field}>
      <Text preset="sectionLabel">{label}</Text>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        maxLength={maxLength}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={styles.placeholderColor}
        returnKeyType="done"
        style={styles.input}
        value={value}
      />
    </View>
  );
}
