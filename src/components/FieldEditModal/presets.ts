import type { ViewStyle } from 'react-native';

import { FIXED_COLORS, type Theme } from '../../theme';

type FieldEditModalStyles = Readonly<{
  scrim: ViewStyle;
  card: ViewStyle;
  header: ViewStyle;
  closeColor: string;
}>;

export const fieldEditModalPresets = {
  default: (theme: Theme): FieldEditModalStyles => ({
    scrim: {
      flex: 1,
      justifyContent: 'center',
      padding: theme.inset.screen,
      backgroundColor: FIXED_COLORS.scrim,
    },
    card: {
      maxHeight: '80%',
      gap: theme.gap.block,
      padding: theme.inset.feature,
      borderRadius: theme.radius.surface,
      backgroundColor: theme.surface,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    closeColor: theme.textMuted,
  }),
} satisfies Record<string, (theme: Theme) => FieldEditModalStyles>;
