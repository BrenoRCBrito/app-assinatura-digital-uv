import React, { useMemo } from 'react';
import { Pressable } from 'react-native';

import { useAppTheme } from '../../theme';
import { Icon, type IconName } from '../Icon';
import { iconButtonPresets, type IconButtonPresetName } from './presets';

type IconButtonProps = Readonly<{
  icon: IconName;
  label: string;
  onPress: () => void;
  preset?: IconButtonPresetName;
}>;

export function IconButton({ icon, label, onPress, preset = 'plain' }: IconButtonProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => iconButtonPresets[preset](theme), [preset, theme]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      onPress={onPress}
    >
      <Icon name={icon} size="standalone" color={styles.iconColor} />
    </Pressable>
  );
}
