import { StyleSheet } from 'react-native';

import type { AppTheme } from '../../theme/appTheme';

export function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    title: {
      fontSize: 22,
      fontWeight: 'bold',
      color: theme.textPrimary,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 24,
    },
    actions: {
      width: '100%',
      alignItems: 'center',
      gap: 12,
    },
  });
}
