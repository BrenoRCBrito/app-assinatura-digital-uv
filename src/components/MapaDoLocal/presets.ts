import type { ViewStyle } from 'react-native';

import type { Theme } from '../../theme';

export const mapaDoLocalPresets = {
  default: (theme: Theme) => ({
    moldura: {
      height: theme.size.map,
      overflow: 'hidden',
      borderRadius: theme.radius.map,
    },
    mapa: {
      flex: 1,
    },
    rotulo: {
      position: 'absolute',
      left: theme.inset.mapLabel,
      bottom: theme.inset.mapLabel,
      paddingVertical: theme.inset.mapLabelY,
      paddingHorizontal: theme.inset.mapLabelX,
      borderRadius: theme.radius.mapLabel,
      backgroundColor: theme.surface,
    },
  }),
} satisfies Record<string, (theme: Theme) => Record<string, ViewStyle>>;
