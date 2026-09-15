import type { ViewStyle } from 'react-native';

import { FIXED_COLORS, type Theme } from '../../theme';

export const loadingOverlayPresets = {
  default: (theme: Theme) => ({
    scrim: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.inset.screen,
      backgroundColor: FIXED_COLORS.scrim,
    },
    card: {
      alignItems: 'center',
      gap: theme.gap.loading,
      padding: theme.inset.feature,
      borderRadius: theme.radius.surface,
      backgroundColor: theme.surface,
    },
  }),
} satisfies Record<string, (theme: Theme) => Record<string, ViewStyle>>;
