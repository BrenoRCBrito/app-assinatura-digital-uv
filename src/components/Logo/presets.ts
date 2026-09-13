import type { ImageStyle } from 'react-native';

import type { Theme } from '../../theme';

export const logoPresets = {
  default: (theme: Theme) => ({
    logo: {
      width: theme.size.logo,
      height: theme.size.logo,
    },
  }),
} satisfies Record<string, (theme: Theme) => Record<string, ImageStyle>>;
