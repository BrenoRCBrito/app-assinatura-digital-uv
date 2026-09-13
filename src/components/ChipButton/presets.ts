import type { ViewStyle } from 'react-native';

import type { Theme } from '../../theme';

export const chipButtonPresets = {
  action: (theme: Theme) => ({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.gap.chip,
      paddingVertical: theme.inset.chipY,
      paddingHorizontal: theme.inset.chipX,
      borderRadius: theme.radius.control,
      borderWidth: theme.lineWidth.outline,
      borderColor: theme.textSecondary,
    },
    pressed: {
      opacity: theme.opacity.pressed,
    },
  }),
} satisfies Record<string, (theme: Theme) => Record<string, ViewStyle>>;

export type ChipButtonPresetName = keyof typeof chipButtonPresets;
