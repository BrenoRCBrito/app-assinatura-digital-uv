import type { ViewStyle } from 'react-native';

import type { Theme } from '../../theme';

export const photoPreviewPresets = {
  default: (theme: Theme) => ({
    titleBar: {
      alignItems: 'center',
      justifyContent: 'center',
      height: theme.size.photoBar,
    },
    photoArea: {
      flex: 1,
      paddingVertical: theme.inset.photoY,
      paddingHorizontal: theme.inset.cameraX,
    },
    photo: {
      flex: 1,
    },
  }),
} satisfies Record<string, (theme: Theme) => Record<string, ViewStyle>>;
