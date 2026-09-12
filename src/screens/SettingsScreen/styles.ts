import { StyleSheet } from 'react-native';

import type { AppTheme } from '../../theme/appTheme';

export function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      padding: 20,
      gap: 28,
    },
    section: {
      gap: 10,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: theme.textSecondary,
    },
    card: {
      gap: 12,
      padding: 16,
      borderRadius: 14,
      backgroundColor: theme.surface,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.textPrimary,
    },
    cardDescription: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.textSecondary,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    rowText: {
      flex: 1,
      gap: 4,
    },
  });
}
