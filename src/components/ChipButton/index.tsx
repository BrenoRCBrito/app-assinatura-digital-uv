import React, { useMemo } from 'react';
import { Pressable } from 'react-native';

import { useAppTheme } from '../../theme';
import { Icon, type IconName } from '../Icon';
import { Text } from '../Text';
import { chipButtonPresets, type ChipButtonPresetName } from './presets';

type ChipButtonProps = Readonly<{
  label: string;
  icon: IconName;
  onPress: () => void;
  disabled?: boolean;
  preset?: ChipButtonPresetName;
}>;

export function ChipButton({ label, icon, onPress, disabled = false, preset = 'action' }: ChipButtonProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => chipButtonPresets[preset](theme), [preset, theme]);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
    >
      <Icon name={icon} size="inline" color={styles.iconColor} />
      <Text preset="chip">{label}</Text>
    </Pressable>
  );
}
