import React, { useMemo } from 'react';
import { Text, TouchableOpacity } from 'react-native';

import type { AppTheme } from '../../theme/appTheme';
import { createStyles } from './styles';

type PrimaryButtonProps = Readonly<{
  label: string;
  onPress: () => void;
  theme: AppTheme;
  disabled?: boolean;
  variant?: 'primary' | 'danger';
}>;

export function PrimaryButton({ label, onPress, theme, disabled = false, variant = 'primary' }: PrimaryButtonProps) {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isDanger = variant === 'danger';

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={[styles.base, isDanger ? styles.danger : styles.primary, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={isDanger ? styles.dangerText : styles.primaryText}>{label}</Text>
    </TouchableOpacity>
  );
}
