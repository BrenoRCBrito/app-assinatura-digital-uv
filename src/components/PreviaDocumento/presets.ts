import type { ViewStyle } from 'react-native';

import { FIXED_COLORS, type Theme } from '../../theme';

type PreviaDocumentoStyles = Readonly<{
  pagina: ViewStyle;
  foto: ViewStyle;
  imagem: ViewStyle;
  selo: ViewStyle;
}>;

export const previaDocumentoPresets = {
  default: (theme: Theme) => ({
    pagina: {
      overflow: 'hidden',
      borderWidth: theme.lineWidth.hairline,
      borderRadius: theme.radius.documentPreview,
      borderColor: FIXED_COLORS.paperBorder,
      backgroundColor: FIXED_COLORS.paper,
    },
    foto: {
      position: 'absolute',
    },
    imagem: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
    selo: {
      position: 'absolute',
    },
  }),
} satisfies Record<string, (theme: Theme) => PreviaDocumentoStyles>;
