import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { useAppTheme } from '../../theme';
import { Text } from '../Text';
import { buttonPresets, buttonSizes, type ButtonPresetName, type ButtonSizeName } from './presets';

type ButtonProps = Readonly<{
  label: string;
  onPress: () => void;
  preset?: ButtonPresetName;
  size?: ButtonSizeName;
  disabled?: boolean;
  flex?: number;
}>;

export function Button({ label, onPress, preset = 'primary', size = 'md', disabled = false, flex }: ButtonProps) {
  const { theme } = useAppTheme();
  const { container, label: labelPreset } = buttonPresets[preset];
  const containerStyle = useMemo(() => {
    const sizeStyle = buttonSizes[size](theme);
    const presetStyle: ViewStyle = container(theme);
    return [
      styles.base,
      sizeStyle,
      presetStyle,
      { paddingVertical: sizeStyle.paddingVertical - (presetStyle.borderWidth ?? 0) },
      disabled && { opacity: theme.opacity.disabled },
    ];
  }, [container, disabled, size, theme]);
  const pressedStyle = useMemo(() => ({ opacity: theme.opacity.pressed }), [theme]);

  const button = (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [containerStyle, pressed && pressedStyle]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text preset={labelPreset}>{label}</Text>
    </Pressable>
  );

  return flex === undefined ? button : <View style={{ flex }}>{button}</View>;
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
