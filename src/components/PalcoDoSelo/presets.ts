import type { ViewStyle } from 'react-native';

import { FIXED_COLORS, type Theme } from '../../theme';

type PalcoDoSeloStyles = Readonly<{
  palco: ViewStyle;
  imagem: ViewStyle;
  moldura: ViewStyle;
  borda: ViewStyle;
  alca: ViewStyle;
  iconColor: string;
}>;

export const palcoDoSeloPresets = {
  default: (theme: Theme) => ({
    palco: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.surface,
      backgroundColor: theme.stage,
    },
    imagem: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
    moldura: {
      backgroundColor: FIXED_COLORS.stampFill,
    },
    borda: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      borderWidth: theme.lineWidth.stampFrame,
      borderStyle: 'dashed',
      borderRadius: theme.radius.stamp,
      borderColor: FIXED_COLORS.stampBorder,
      pointerEvents: 'none',
    },
    alca: {
      position: 'absolute',
      top: -theme.radius.stampHandle,
      right: -theme.radius.stampHandle,
      alignItems: 'center',
      justifyContent: 'center',
      width: theme.size.stampHandle,
      height: theme.size.stampHandle,
      borderRadius: theme.radius.stampHandle,
      backgroundColor: FIXED_COLORS.stampHandle,
      pointerEvents: 'none',
    },
    iconColor: FIXED_COLORS.stampHandleIcon,
  }),
} satisfies Record<string, (theme: Theme) => PalcoDoSeloStyles>;
