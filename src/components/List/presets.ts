import type { ViewStyle } from 'react-native';

import type { Theme } from '../../theme';

export const listPresets = {
  default: (theme: Theme) => ({
    content: {
      flexGrow: 1,
      gap: theme.gap.list,
      paddingHorizontal: theme.inset.screen,
      paddingTop: theme.inset.screenTop,
    },
  }),
} satisfies Record<string, (theme: Theme) => Record<string, ViewStyle>>;

export type ListPresetName = keyof typeof listPresets;
