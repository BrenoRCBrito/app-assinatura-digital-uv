import React, { useMemo } from 'react';
import { Text, TouchableOpacity } from 'react-native';

import type { AppTheme } from '../../theme/appTheme';
import { createStyles } from './styles';

type PrimaryButtonProps = Readonly<{
  label: string;
  onPress: () => void;
  theme: AppTheme;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}>;

export function PrimaryButton({ label, onPress, theme, disabled = false, variant = 'primary' }: PrimaryButtonProps) {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const variantStyles = {
    primary: { container: styles.primary, text: styles.primaryText },
    secondary: { container: styles.secondary, text: styles.secondaryText },
    danger: { container: styles.danger, text: styles.dangerText },
  }[variant];

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={[styles.base, variantStyles.container, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={variantStyles.text}>{label}</Text>
    </TouchableOpacity>
  );
}
