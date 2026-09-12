import { StyleSheet } from 'react-native';

import type { AppTheme } from '../../theme/appTheme';

export function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    base: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    primary: {
      backgroundColor: theme.primary,
      paddingVertical: 14,
      paddingHorizontal: 28,
      borderRadius: 8,
      width: '100%',
    },
    secondary: {
      paddingVertical: 12.5,
      paddingHorizontal: 28,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: theme.textSecondary,
      width: '100%',
    },
    danger: {
      backgroundColor: theme.danger,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 6,
    },
    disabled: {
      opacity: 0.45,
    },
    primaryText: {
      color: theme.onPrimary,
      fontSize: 16,
      fontWeight: '600',
    },
    secondaryText: {
      color: theme.textSecondary,
      fontSize: 16,
      fontWeight: '600',
    },
    dangerText: {
      color: theme.onDanger,
      fontSize: 16,
      fontWeight: '600',
    },
  });
}
