import type { ViewStyle } from 'react-native';

import type { Theme } from '../../theme';

export const cardPresets = {
  default: (theme: Theme) => ({
    card: {
      gap: theme.gap.card,
      padding: theme.inset.card,
      borderRadius: theme.radius.surface,
      backgroundColor: theme.surface,
    },
    heading: {
      gap: theme.gap.text,
    },
  }),
} satisfies Record<string, (theme: Theme) => Record<string, ViewStyle>>;

export type CardPresetName = keyof typeof cardPresets;
