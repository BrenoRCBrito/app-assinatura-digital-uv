import type { ViewStyle } from 'react-native';

import { FIXED_COLORS, type Theme } from '../../theme';
import type { IconSizeName } from '../Icon/presets';

type IconButtonStyles = Readonly<{
  button: ViewStyle;
  pressed: ViewStyle;
  iconSize: IconSizeName;
  iconColor: string;
}>;

function touchTarget(theme: Theme): ViewStyle {
  return {
    width: theme.size.touchTarget,
    height: theme.size.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  };
}

export const iconButtonPresets = {
  plain: (theme: Theme) => ({
    button: touchTarget(theme),
    pressed: {
      opacity: theme.opacity.pressed,
    },
    iconSize: 'standalone',
    iconColor: theme.textSecondary,
  }),
  overlay: (theme: Theme) => ({
    button: {
      ...touchTarget(theme),
      borderRadius: theme.radius.cameraControl,
      backgroundColor: FIXED_COLORS.cameraControl,
    },
    pressed: {
      opacity: theme.opacity.pressed,
    },
    iconSize: 'overlay',
    iconColor: theme.textPrimary,
  }),
} satisfies Record<string, (theme: Theme) => IconButtonStyles>;

export type IconButtonPresetName = keyof typeof iconButtonPresets;
