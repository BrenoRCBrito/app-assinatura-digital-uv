import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { useAppTheme } from '../../theme';
import { Icon, type IconName } from '../Icon';
import { Text } from '../Text';
import { buttonPresets, buttonSizes, type ButtonPresetName, type ButtonSizeName } from './presets';

type ButtonProps = Readonly<{
  label: string;
  onPress: () => void;
  preset?: ButtonPresetName;
  size?: ButtonSizeName;
  icon?: IconName;
  disabled?: boolean;
  flex?: number;
}>;

export function Button({
  label,
  onPress,
  preset = 'primary',
  size = 'md',
  icon,
  disabled = false,
  flex,
}: ButtonProps) {
  const { theme } = useAppTheme();
  const { container, label: labelPreset, iconColor } = buttonPresets[preset];
  const containerStyle = useMemo(() => {
    const sizeStyle = buttonSizes[size](theme);
    const presetStyle: ViewStyle = container(theme);
    return [
      styles.base,
      { gap: theme.gap.icon },
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
      {icon === undefined ? null : <Icon name={icon} size="inline" color={iconColor(theme)} />}
      <View style={styles.label}>
        <Text preset={labelPreset}>{label}</Text>
      </View>
    </Pressable>
  );

  return flex === undefined ? button : <View style={{ flex }}>{button}</View>;
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flexShrink: 1,
  },
});
