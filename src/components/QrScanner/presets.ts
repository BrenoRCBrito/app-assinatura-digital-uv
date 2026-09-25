import type { ViewStyle } from 'react-native';

import { FIXED_COLORS, type Theme } from '../../theme';

export const qrScannerPresets = {
  default: (theme: Theme) => ({
    camera: {
      flex: 1,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: theme.size.cameraBar,
      paddingHorizontal: theme.inset.cameraBarX,
    },
    hint: {
      flexShrink: 1,
      paddingVertical: theme.inset.hintY,
      paddingHorizontal: theme.inset.hintX,
      borderRadius: theme.radius.hint,
      backgroundColor: FIXED_COLORS.cameraHint,
    },
    topBarBalance: {
      width: theme.size.touchTarget,
    },
    viewfinder: {
      flex: 1,
      overflow: 'hidden',
    },
  }),
} satisfies Record<string, (theme: Theme) => Record<string, ViewStyle>>;
