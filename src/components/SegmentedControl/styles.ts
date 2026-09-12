import { StyleSheet } from 'react-native';

import type { AppTheme } from '../../theme/appTheme';

export function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    track: {
      flexDirection: 'row',
      gap: 4,
      padding: 4,
      borderRadius: 10,
      backgroundColor: theme.background,
    },
    segment: {
      flex: 1,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 7,
    },
    segmentSelected: {
      backgroundColor: theme.primary,
    },
    label: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    labelSelected: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.onPrimary,
    },
  });
}
