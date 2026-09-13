import type { ViewStyle } from 'react-native';

import type { Theme } from '../../theme';

export const toggleRowPresets = {
  default: (theme: Theme) => ({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.gap.row,
    },
    texts: {
      flex: 1,
      gap: theme.gap.text,
    },
  }),
} satisfies Record<string, (theme: Theme) => Record<string, ViewStyle>>;

export type ToggleRowPresetName = keyof typeof toggleRowPresets;
