import type { ViewStyle } from 'react-native';

import type { Theme } from '../../theme';

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
  }),
} satisfies Record<string, (theme: Theme) => Record<string, ViewStyle>>;

export type IconButtonPresetName = keyof typeof iconButtonPresets;
