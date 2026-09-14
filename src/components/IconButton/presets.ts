import type { ViewStyle } from 'react-native';

import type { Theme } from '../../theme';

type IconButtonStyles = Readonly<{
  button: ViewStyle;
  pressed: ViewStyle;
  iconColor: string;
}>;

export const iconButtonPresets = {
  plain: (theme: Theme) => ({
    button: {
      width: theme.size.touchTarget,
      height: theme.size.touchTarget,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: {
      opacity: theme.opacity.pressed,
    },
    iconColor: theme.textSecondary,
  }),
} satisfies Record<string, (theme: Theme) => IconButtonStyles>;

export type IconButtonPresetName = keyof typeof iconButtonPresets;
