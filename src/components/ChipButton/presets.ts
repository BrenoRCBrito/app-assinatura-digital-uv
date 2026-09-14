import type { ViewStyle } from 'react-native';

import type { Theme } from '../../theme';

type ChipButtonStyles = Readonly<{
  chip: ViewStyle;
  pressed: ViewStyle;
  iconColor: string;
}>;

export const chipButtonPresets = {
  action: (theme: Theme) => ({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.gap.chip,
      minHeight: theme.size.touchTarget,
      paddingVertical: theme.inset.chipY,
      paddingHorizontal: theme.inset.chipX,
      borderRadius: theme.radius.control,
      borderWidth: theme.lineWidth.outline,
      borderColor: theme.textSecondary,
    },
    pressed: {
      opacity: theme.opacity.pressed,
    },
    iconColor: theme.textSecondary,
  }),
} satisfies Record<string, (theme: Theme) => ChipButtonStyles>;

export type ChipButtonPresetName = keyof typeof chipButtonPresets;
